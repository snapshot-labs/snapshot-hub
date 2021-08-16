import fetch from 'cross-fetch';
import db from '../helpers/mysql';

const delay = 300;
const interval = 120;
const serviceEvents = parseInt(process.env.SERVICE_EVENTS || '0');

const subscribers = [
  'https://snapshot.events/api/event',
  'https://sgbbedlmia.execute-api.eu-central-1.amazonaws.com/PROD/v1/new'
];

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
  console.log('Process events', ts, events.length);
  for (const event of events) {
    try {
      await Promise.all(
        subscribers.map(subscriber => sendEvent(event, subscriber))
      );
    } catch (e) {
      console.log('Event failed', e);
    }
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
  setInterval(async () => {
    await processEvents();
  }, interval * 1e3);
}
