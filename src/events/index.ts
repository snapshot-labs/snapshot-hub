import fetch from 'cross-fetch';
import db from '../helpers/mysql';
import subscribers from './subscribers.json';

const delay = 5;
const interval = 30;
const serviceEvents = parseInt(process.env.SERVICE_EVENTS || '0');

async function sendEvent(event, to) {
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
  console.log('Process event start', ts, events.length);
  for (const event of events) {
    Promise.all(
      subscribers
        .filter(
          subscriber =>
            !subscriber.spaces || subscriber.spaces.includes(event.space)
        )
        .map(subscriber => sendEvent(event, subscriber.url))
    )
      .then(() => console.log('Process event done'))
      .catch(e => console.log('Process event failed', e));

    try {
      await db.queryAsync(
        'DELETE FROM events WHERE id = ? AND event = ? LIMIT 1',
        [event.id, event.event]
      );
      console.log(`Event sent ${event.id} ${event.event}`);
    } catch (e) {
      console.log(e);
    }
  }
}

if (serviceEvents) {
  setInterval(async () => await processEvents(), interval * 1e3);
}
