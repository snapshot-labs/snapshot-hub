import db from '../helpers/mysql';

const delay = 300;

async function processEvents() {
  const ts = parseInt((Date.now() / 1e3).toFixed()) - delay;
  const events = await db.queryAsync('SELECT * FROM events WHERE expire <= ?', [
    ts
  ]);
  console.log('Process events', ts, events.length);
  for (const event of events) {
    // @TODO Send notification

    await db.queryAsync(
      'DELETE FROM events WHERE id = ? AND event = ? LIMIT 1',
      [event.id, event.event]
    );
    console.log(`Event sent ${event.id} ${event.event}`);
  }
}

setInterval(async () => {
  await processEvents();
}, delay * 1e3);
