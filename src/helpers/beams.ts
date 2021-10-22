import PushNotifications from '@pusher/push-notifications-server';

const beams = new PushNotifications({
  instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID ?? '',
  secretKey: process.env.PUSHER_BEAMS_SECRET_KEY ?? ''
});

export default beams;
