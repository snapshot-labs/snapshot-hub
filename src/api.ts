import express from 'express';
import { spaces, spacesMetadata } from './helpers/spaces';
import relayer from './helpers/relayer';
import { addOrUpdateSpace, loadSpace } from './helpers/actions';
import { name, version } from '../package.json';
import { getProposalScores } from './scores';

const router = express.Router();
const network = process.env.NETWORK || 'testnet';

router.get('/', (req, res) => {
  const commit = process.env.COMMIT_HASH || '';
  const v = commit ? `${version}#${commit.substr(0, 7)}` : version;
  return res.json({
    name,
    network,
    version: v,
    relayer: relayer.address
  });
});

router.get('/scores/:proposalId', async (req, res) => {
  const { proposalId } = req.params;
  const success = await getProposalScores(proposalId);
  return res.json({ success });
});

router.get('/explore', (req, res) => {
  return res.json({ spaces: spacesMetadata });
});

router.get('/spaces/:key', (req, res) => {
  const { key } = req.params;
  return res.json(spaces[key]);
});

router.get('/spaces/:key/poke', async (req, res) => {
  const { key } = req.params;
  const space = await loadSpace(key);
  if (space) {
    await addOrUpdateSpace(key, space);
    spaces[key] = space;
  }
  return res.json(space);
});

export default router;
