import express from 'express';
import { spaces } from './helpers/spaces';
import { name, version } from '../package.json';
import { sendError } from './helpers/utils';

const router = express.Router();
const network = process.env.NETWORK || 'testnet';
const SEQUENCER_URL = process.env.SEQUENCER_URL || '';

router.post('/message', async (req, res) => {
  return sendError(res, 'personal sign is not supported anymore');
});

router.post('/msg', async (req, res) => {
  res.redirect(307, SEQUENCER_URL);
});

router.get('/', (req, res) => {
  const commit = process.env.COMMIT_HASH || '';
  const v = commit ? `${version}#${commit.substring(0, 7)}` : version;
  return res.json({
    name,
    network,
    version: v
  });
});

router.get('/spaces/:key', (req, res) => {
  const { key } = req.params;
  return res.json(spaces[key]);
});

router.get('/spaces/:key/poke', async (req, res) => {
  const { key } = req.params;
  res.redirect(307, `${SEQUENCER_URL}/spaces/${key}/poke`);
});

router.get('/scores/:proposalId', async (req, res) => {
  const { proposalId } = req.params;
  res.redirect(307, `${SEQUENCER_URL}/scores/${proposalId}`);
});

export default router;
