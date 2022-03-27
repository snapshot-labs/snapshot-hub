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
import { hashMessage } from '@ethersproject/hash';
import { getProposalScores } from '../scores';
import { MerkleTree } from 'merkletreejs';
import { utils } from 'ethers';
import { Wallet } from '@ethersproject/wallet';
import keccak256 from "keccak256";

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

router.get('/merkle/:proposalId', async (req, res) => {
  const { proposalId } = req.params;
  const users = [
    {
      proposalId,
      to: '0x27711f9c07230632F2EE1A21a967a9AC4729E520',
      amount: 1000000000000000 // 0.001
    }
  ];

  const elements = users.map((x) =>
    utils.solidityKeccak256(["bytes32", "address", "uint256"], [x.proposalId, x.to, x.amount])
  );

  const merkleTree = new MerkleTree(elements, keccak256, { sort: true });
  const root = merkleTree.getHexRoot();

  const message = utils.arrayify(utils.solidityKeccak256(
    ['bytes32', 'bytes32'],
    [proposalId, root]
  ))
  const wallet = new Wallet('6a0554707ce860357770eaa09ffffd939232b79d6b82c01949c081e0f0f0b364')
  const signature = await wallet.signMessage(message)
  return res.json({
    root,
    signature
  });
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
