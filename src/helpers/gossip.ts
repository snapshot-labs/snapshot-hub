import fetch from 'cross-fetch';
import db from './mysql';

let hubs = [];

export default async function gossip(body, space) {
  hubs
    .filter(
      (hub: any) => hub.scope === '' || hub.scope.slice(',').includes(space)
    )
    .forEach((hub: any) => {
      fetch(`https://${hub.host}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(res => res.json())
        .then(json => console.log('Relay success', json))
        .catch(e => console.log('Relay failed', e));
    });
}

setTimeout(async () => {
  try {
    hubs = await db.queryAsync(
      `SELECT * FROM hubs WHERE is_active = '1' AND is_self = '0'`
    );
  } catch (e) {
    console.log('Load hubs failed', e);
  }
}, 1e3);
