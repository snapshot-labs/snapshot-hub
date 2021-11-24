import fetch from 'cross-fetch';
import beams from '../helpers/beams';
import db from '../helpers/mysql';
import subscribers from './subscribers.json';
import chunk from 'lodash/chunk';
import { getProposalScores } from '../scores';
import { sha256 } from '../helpers/utils';

const delay = 5;
const interval = 30;
const serviceEvents = parseInt(process.env.SERVICE_EVENTS || '0');
const serviceEventsSalt = parseInt(process.env.SERVICE_EVENTS_SALT || '12345');
const servicePushNotifications = parseInt(
  process.env.SERVICE_PUSH_NOTIFICATIONS || '0'
);

const getProposal = async proposalId => {
  try {
    const proposals = await db.queryAsync(
      'SELECT * FROM proposals WHERE id = ?',
      [proposalId]
    );
    const proposal = proposals[0];
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

  const wallets = subscriptions.map(subscription => subscription.address);
  return wallets;
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
  const res = await fetch(to, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  return res.json();
}

async function processEvents() {
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
          scores.scores_state,
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

if (serviceEvents) {
  setInterval(async () => await processEvents(), interval * 1e3);
}
