import fetch from 'cross-fetch';
import db from '../helpers/mysql';

const delay = 300;
const to = 'https://snapshot.events/api/event';

async function sendEvent(event) {
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
      await sendEvent(event);
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

setInterval(async () => {
  await processEvents();
}, delay * 1e3);
