import express from 'express';
import snapshot from '@snapshot-labs/snapshot.js';
import { spaces, spacesMetadata } from './helpers/spaces';
import relayer from './helpers/relayer';
import { addOrUpdateSpace } from './helpers/actions';
import { getSpaceENS } from './helpers/ens';
import { updateProposalAndVotes } from './scores';
import log from './helpers/log';
import { name, version } from '../package.json';

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
  try {
    const result = await updateProposalAndVotes(proposalId);
    return res.json({ result });
  } catch (e) {
    log.warn(`[api] updateProposalAndVotes() failed ${proposalId}, ${JSON.stringify(e)}`);
    return res.json({ error: 'failed', message: e });
  }
});

router.get('/explore', (req, res) => {
  return res.json({ spaces: spacesMetadata });
});

router.get('/spaces/:key', (req, res) => {
  const { key } = req.params;
  return res.json(spaces[key] || false);
});

router.get('/spaces/:key/poke', async (req, res) => {
  const { key } = req.params;
  try {
    let space = false;
    const result = await getSpaceENS(key);
    if (snapshot.utils.validateSchema(snapshot.schemas.space, result) === true) space = result;
    if (space) {
      await addOrUpdateSpace(key, space);
      spaces[key] = space;
    }
    return res.json(space);
  } catch (e) {
    log.warn(`[api] Load space failed ${key}`);
    return res.json(false);
  }
});

export default router;
