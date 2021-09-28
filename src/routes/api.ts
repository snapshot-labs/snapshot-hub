import express from 'express';
import snapshot from '@snapshot-labs/snapshot.js';
import gateways from '@snapshot-labs/snapshot.js/src/gateways.json';
import {
  spaces,
  spaceProposals,
  spaceFollowers,
  spaceOneDayVoters
} from '../helpers/spaces';
import relayer from '../helpers/relayer';
import { sendError } from '../helpers/utils';
import { addOrUpdateSpace, loadSpace } from '../helpers/adapters/mysql';
import ingestor from '../ingestor';
import pkg from '../../package.json';
import db from '../helpers/mysql';
import { hashPersonalMessage } from '../ingestor/personalSign/utils';

const gateway = gateways[0];

const router = express.Router();
const network = process.env.NETWORK || 'testnet';

router.get('/', (req, res) => {
  return res.json({
    name: pkg.name,
    network,
    version: pkg.version,
    tag: 'alpha',
    relayer: relayer.address
  });
});

router.get('/explore', (req, res) => {
  const spacesMetadata = {};
  const networks = {};
  const strategies = {};
  const plugins = {};
  const skins = {};
  const validations = {};

  Object.entries(spaces).forEach(([id, space]: any) => {
    if (space.skin)
      skins[space.skin] = skins[space.skin] ? skins[space.skin] + 1 : 1;

    if (space.validation)
      validations[space.validation.name] = validations[space.validation.name]
        ? validations[space.validation.name] + 1
        : 1;

    networks[space.network] = networks[space.network]
      ? networks[space.network] + 1
      : 1;

    space.strategies.forEach(strategy => {
      strategies[strategy.name] = strategies[strategy.name]
        ? strategies[strategy.name] + 1
        : 1;
    });

    Object.keys(space.plugins || {}).forEach(plugin => {
      plugins[plugin] = plugins[plugin] ? plugins[plugin] + 1 : 1;
    });

    spacesMetadata[id] = {
      name: space.name,
      avatar: space.avatar || undefined,
      private: space.private || undefined,
      skin: space.skin || undefined,
      terms: space.terms || undefined,
      network: space.network || undefined,
      activeProposals:
        (spaceProposals[id] && spaceProposals[id].active) || undefined,
      proposals: (spaceProposals[id] && spaceProposals[id].count) || undefined,
      proposals_1d:
        (spaceProposals[id] && spaceProposals[id].count_1d) || undefined,
      followers: (spaceFollowers[id] && spaceFollowers[id].count) || undefined,
      followers_1d:
        (spaceFollowers[id] && spaceFollowers[id].count_1d) || undefined,
      voters_1d: spaceOneDayVoters[id] || undefined
    };
  });

  return res.json({
    spaces: spacesMetadata,
    networks,
    strategies,
    skins,
    plugins,
    validations
  });
});

router.get('/report/:id/:source?', async (req, res) => {
  const { id, source } = req.params;
  let votes: any = [];
  let sources: any = false;

  const query = `
    SELECT v.id, v.ipfs FROM votes v
    LEFT OUTER JOIN votes v2 ON
      v.voter = v2.voter AND v.proposal = v2.proposal
      AND ((v.created < v2.created) OR (v.created = v2.created AND v.id < v2.id))
    WHERE v2.voter IS NULL AND v.proposal = ?
    ORDER BY v.created DESC
  `;
  try {
    votes = await db.queryAsync(query, [id]);
  } catch (e) {
    console.log(e);
    return Promise.reject('request failed');
  }

  if (source) {
    const p: any = [];
    votes.forEach(vote => {
      p.push(snapshot.utils.ipfsGet(gateway, vote.ipfs));
    });
    try {
      sources = await Promise.all(p);
    } catch (e) {
      console.log(e);
      return sendError(res, e);
    }
  }

  votes = source ? sources : votes.map(vote => vote.id);
  const message = {
    proposal: id,
    status: 'pending',
    votes: votes
  };

  const hash = hashPersonalMessage(JSON.stringify(message));
  const sig = await relayer.signMessage(hash);

  return res.json({
    relayer: relayer.address,
    sig,
    hash,
    message
  });
});

router.get('/spaces/:key?', (req, res) => {
  const { key } = req.params;
  return res.json(key ? spaces[key] : spaces);
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

router.post('/message', async (req, res) => {
  try {
    const result = await ingestor(req.body, 'personal-sign');
    return res.json(result);
  } catch (e) {
    return sendError(res, e);
  }
});

router.post('/msg', async (req, res) => {
  try {
    const result = await ingestor(req.body, 'typed-data');
    return res.json(result);
  } catch (e) {
    return sendError(res, e);
  }
});

export default router;
