import { Keycard } from '@snapshot-labs/keycard';

const keycard = new Keycard({
  app: 'snapshot-hub',
  secret: process.env.KEYCARD_SECRET,
  URL: 'http://localhost:8888'
});

export default keycard;
