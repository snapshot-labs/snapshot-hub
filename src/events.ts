import fetch from 'cross-fetch';
import beams from './helpers/beams';
import db from './helpers/mysql';
import chunk from 'lodash/chunk';
import { getProposalScores } from './scores';
import { getJSON, sha256 } from './helpers/utils';

const delay = 5;
const interval = 30;
const serviceEventsSubscribers = process.env.SERVICE_EVENTS_SUBSCRIBERS || 0;
const serviceEvents = parseInt(process.env.SERVICE_EVENTS || '0');
const serviceEventsSalt = parseInt(process.env.SERVICE_EVENTS_SALT || '12345');
const servicePushNotifications = parseInt(
  process.env.SERVICE_PUSH_NOTIFICATIONS || '0'
);
const webhookURL = process.env.SNAPSHOT_WEBHOOK_URL || '';

const getProposal = async proposalId => {
  try {
    const query = 'SELECT * FROM proposals WHERE id = ?';
    const [proposal] = await db.queryAsync(query, [proposalId]);
    return proposal;
  } catch (error) {
    throw new Error(`Proposal not found with id ${proposalId}`);
  }
};

const getSubscribedWallets = async space => {
  const subscriptions = await db.queryAsync(
    'SELECT * FROM subscriptions WHERE space = ?',
    [space]
  );
  return subscriptions.map(subscription => subscription.address);
};

const sendPushNotification = async event => {
  const subscribedWallets = await getSubscribedWallets(event.space);
  const walletsChunks = chunk(subscribedWallets, 100);
  const proposal = await getProposal(event.id.replace('proposal/', ''));

  for await (const walletsChunk of walletsChunks) {
    await beams.publishToInterests(walletsChunk, {
      web: {
        notification: {
          title: event.space,
          body: proposal.title,
          deep_link: `${process.env.SNAPSHOT_URI}/#/${event.space}/${event.id}`
        }
      }
    });
  }
};

async function sendEvent(event, to) {
  event.token = sha256(`${to}${serviceEventsSalt}`);
  event.secret = sha256(`${to}${serviceEventsSalt}`);
  const headerSecret = sha256(`${to}${process.env.SERVICE_EVENTS_SALT}`);
  const res = await fetch(to, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authentication: headerSecret
    },
    body: JSON.stringify(event)
  });
  return res.json();
}

export async function sendEventToWebhook(event) {
  if (!webhookURL) return;
  // TODO: handle errors and retry, maybe save in temporary table
  try {
    // TODO: This secret is temporary key, replace this with event URL once events code is removed
    const secret = sha256(`${webhookURL}/api/webhook?cb=1'${serviceEventsSalt}`);
    const res = await fetch(webhookURL + '/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authentication: secret
      },
      body: JSON.stringify(event)
    });
    const responseJSON = await res.json();
    if (responseJSON.error) {
      console.log('[sendEventToWebhook]', responseJSON);
    }
    return responseJSON;
  } catch (error) {
    console.log('[sendEventToWebhook]', error);
  }
}

async function processEvents(subscribers) {
  const ts = parseInt((Date.now() / 1e3).toFixed()) - delay;
  const events = await db.queryAsync('SELECT * FROM events WHERE expire <= ?', [
    ts
  ]);

  console.log('[events] Process event start', ts, events.length);

  for (const event of events) {
    if (event.event === 'proposal/end') {
      try {
        const proposalId = event.id.replace('proposal/', '');
        const scores = await getProposalScores(proposalId);
        console.log(
          '[events] Stored scores on proposal/end',
          scores?.scores_state || 'without scores',
          proposalId
        );
      } catch (e) {
        console.log('[events]', e);
      }
    }

    if (servicePushNotifications && event.event === 'proposal/start')
      sendPushNotification(event);

    Promise.all(
      subscribers
        .filter(
          subscriber =>
            !subscriber.spaces || subscriber.spaces.includes(event.space)
        )
        .map(subscriber => sendEvent(event, subscriber.url))
    )
      .then(() => console.log('[events] Process event done'))
      .catch(e => console.log('[events] Process event failed', e));

    try {
      await db.queryAsync(
        'DELETE FROM events WHERE id = ? AND event = ? LIMIT 1',
        [event.id, event.event]
      );
      console.log(`[events] Event sent ${event.id} ${event.event}`);
    } catch (e) {
      console.log('[events]', e);
    }
  }
}

if (serviceEvents && serviceEventsSubscribers) {
  setInterval(async () => {
    try {
      const subscribers = await getJSON(serviceEventsSubscribers);
      console.log('[events] Subscribers', subscribers.length);
      await processEvents(subscribers);
    } catch (e) {
      console.log('[events] Failed to process');
    }
  }, interval * 1e3);
}
