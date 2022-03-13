import fetch from 'cross-fetch';

export const sendEventToWebhook = async event => {
  // TODO: Authenticate webhook
  fetch(`${process.env.SNAPSHOT_WEBHOOK_URL}/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  // TODO: handle failed events, store in DB and retry, or store first and send later
};
