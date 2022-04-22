import express from 'express';
import snapshot from '@snapshot-labs/snapshot.js';
import gateways from '@snapshot-labs/snapshot.js/src/gateways.json';
import { spaces, spacesMetadata } from '../helpers/spaces';
import relayer from '../helpers/relayer';
import { sendError } from '../helpers/utils';
import { addOrUpdateSpace, loadSpace } from '../helpers/adapters/mysql';
import ingestor from '../ingestor';
import pkg from '../../package.json';
import db from '../helpers/mysql';
import { hashMessage, id } from '@ethersproject/hash';
import { getProposalScores } from '../scores';
import { Wallet } from '@ethersproject/wallet';
import { keccak256 } from '@ethersproject/solidity';
import { arrayify } from '@ethersproject/bytes';
import { pinJson } from '../helpers/ipfs';

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

router.get('/boost/:proposalId', async (req, res) => {
  const { proposalId } = req.params;

  let proposal: any;
  let plugins: any;
  let votes: any;

  try {
    proposal = await db.queryAsync(
      `SELECT p.plugins FROM proposals p
      WHERE p.id = ? AND p.end < UNIX_TIMESTAMP() AND p.scores_state = 'final'
      LIMIT 1`,
      [proposalId]
    );
  } catch (e) {
    console.log('[api]', e);
    return Promise.reject('request failed');
  }

  if (!proposal.length) {
    return Promise.reject('proposal not found');
  }

  proposal = proposal[0];
  plugins = JSON.parse(proposal.plugins);

  if (plugins?.boost) {
    if (plugins.boost.ipfs) {
      return res.json({ ipfsHash: plugins.boost.ipfs });
    }

    try {
      votes = await db.queryAsync(
        `SELECT v.id, v.voter, v.vp FROM votes v
        LEFT OUTER JOIN votes v2 ON
          v.voter = v2.voter AND v.proposal = v2.proposal
          AND ((v.created < v2.created) OR (v.created = v2.created AND v.id < v2.id))
        WHERE v2.voter IS NULL AND v.vp_state = 'final' AND v.proposal = ?
        ORDER BY v.created DESC`,
        [proposalId]
      );
    } catch (e) {
      console.log('[api]', e);
      return Promise.reject('request failed');
    }
  
    // sign votes
    const signatures: Record<string, string> = {};
    const wallet = new Wallet(process.env.BOOST_GUARD_PK as string);
    for (const vote of votes) {
      const message = arrayify(keccak256(
        ['bytes32', 'address'],
        [id(proposalId), vote.voter.toLowerCase()]
      ))
      const signature = await wallet.signMessage(message);
      signatures[vote.voter.toLowerCase()] = signature;
    }
  
    const ipfsHash = await pinJson(`boost/${proposalId}`, signatures);
    plugins.boost.ipfs = ipfsHash;
  
    await db.queryAsync(`UPDATE proposals SET plugins = ? WHERE id = ?`, [JSON.stringify(plugins), proposalId]);
  
    return res.json({ ipfsHash });
  }

  return Promise.reject('boost not configured for this proposal');
});

router.get('/scores/:proposalId', async (req, res) => {
  const { proposalId } = req.params;
  return res.json(await getProposalScores(proposalId));
});

router.get('/explore', (req, res) => {
  return res.json({ spaces: spacesMetadata });
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
    console.log('[api]', e);
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
      console.log('[api]', e);
      return sendError(res, e);
    }
  }

  votes = source ? sources : votes.map(vote => vote.id);
  const message = {
    proposal: id,
    status: 'pending',
    votes: votes
  };

  const hash = hashMessage(JSON.stringify(message));
  const sig = await relayer.signMessage(hash);

  return res.json({
    relayer: relayer.address,
    sig,
    hash,
    message
  });
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
