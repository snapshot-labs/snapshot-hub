import fetch from 'cross-fetch';
import { sha256 } from './utils';

const webhookURL = process.env.SNAPSHOT_WEBHOOK_URL || '';

export async function sendToWebhook(event) {
  if (!webhookURL) return;

  // TODO: handle errors and retry, maybe save in temporary table
  try {
    const secret = sha256(
      `${webhookURL}/api/event${process.env.SERVICE_EVENTS_SALT}`
    );
    const res = await fetch(`${webhookURL}/api/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authentication: secret
      },
      body: JSON.stringify(event)
    });
    const json = await res.json();
    if (json.error) console.log('[webhook] Error', json);
    return json;
  } catch (e) {
    console.log('[webhook] Error', e);
  }
}
