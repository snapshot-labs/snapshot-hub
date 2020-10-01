import express from 'express';
import redis from './helpers/redis';
import relayer from './helpers/relayer';
import { pinJson } from './helpers/ipfs';
import { verify, jsonParse, sendError } from './helpers/utils';
import { sendMessage } from './helpers/discord';
import pkg from '../package.json';
import { storeProposal as redisStoreProposal, storeVote as redisStoreVote } from './helpers/connectors/redis';
import { storeProposal as mysqlStoreProposal, storeVote as mysqlStoreVote } from './helpers/connectors/mysql';

const ns = process.env.NAMESPACE;
const router = express.Router();

router.get('/', (req, res) => {
  return res.json({
    name: pkg.name,
    version: pkg.version,
    relayer: relayer.address,
  });
});

router.get('/:token/proposals', async (req, res) => {
  const { token } = req.params;
  let proposals = await redis.hgetallAsync(`token:${token}:proposals`);
  if (!proposals) {
    return res.json({});
  }

  proposals = Object.fromEntries(
    Object.entries(proposals).map((proposal: any) => {
      proposal[1] = JSON.parse(proposal[1]);
      return proposal;
    })
  );

  return res.json(proposals);
});

router.get('/:token/proposal/:id', async (req, res) => {
  const { token, id } = req.params;
  let votes = (await redis.hgetallAsync(`token:${token}:proposal:${id}:votes`)) || {};
  if (votes) {
    votes = Object.fromEntries(
      Object.entries(votes).map((vote: any) => {
        vote[1] = JSON.parse(vote[1]);
        return vote;
      })
    );
  }
  return res.json(votes);
});

router.get('/:token/snapshot/:date', async (req, res) => {
  const { token, date } = req.params;
  let ipfsHash = await redis.hgetallAsync(`token:${token}:snapshot:${date}`);
  if (!ipfsHash) {
    return res.json({});
  }
  return res.json({ ipfsHash: ipfsHash });
});

router.post('/:token/snapshot/:date', async (req, res) => {
  const { token, date } = req.params;

  const sig = await relayer.signMessage(`${token}/snapshot/${date}`);
  const ipfsHash = await pinJson(`${ns}/${sig}`, req.body);
  await redis.hmsetAsync(`token:${token}:snapshot:${date}`, `${date}`, ipfsHash);
  
  let message = `**New Snapshot**\n`;
  message += `Token: ${token}\n`;
  message += `Date: ${date}\n`;
  message += `<https://ipfs.io/ipfs/${ipfsHash}>`;
  sendMessage(message);
  console.log(message);

  return res.json({ ipfsHash: ipfsHash });
});

router.post('/message', async (req, res) => {
  const body = req.body;
  const msg = jsonParse(body.msg);
  const ts = (Date.now() / 1e3).toFixed();

  if (!body || !body.address || !body.msg || !body.sig) {
    return sendError(res, 'wrong message body');
  }

  if (Object.keys(msg).length !== 5 || !msg.token || !msg.payload || Object.keys(msg.payload).length === 0) {
    return sendError(res, 'wrong signed message');
  }

  if (!msg.timestamp || typeof msg.timestamp !== 'string' || msg.timestamp > ts + 30) {
    return sendError(res, 'wrong timestamp');
  }

  if (!msg.version || msg.version !== pkg.version) {
    return sendError(res, 'wrong version');
  }

  if (!msg.type || !['proposal', 'vote'].includes(msg.type)) {
    return sendError(res, 'wrong message type');
  }

  if (!(await verify(body.address, body.msg, body.sig))) {
    return sendError(res, 'wrong signature');
  }

  if (msg.type === 'proposal') {
    const proposal = msg.payload;

    if (Object.keys(proposal).length !== 6 || !proposal.choices || proposal.choices.length < 2 || !proposal.metadata) {
      return sendError(res, 'wrong proposal format');
    }

    if (!proposal.name || proposal.name.length > 256 || !proposal.body || proposal.body.length > 4e4) {
      return sendError(res, 'wrong proposal size');
    }

    if (typeof proposal.metadata !== 'object' || JSON.stringify(proposal.metadata).length > 2e4) {
      return sendError(res, 'wrong proposal metadata');
    }

    if (!proposal.start || ts > proposal.start || !proposal.end || proposal.start >= proposal.end) {
      return sendError(res, 'wrong proposal period');
    }
  }

  if (msg.type === 'vote') {
    if (Object.keys(msg.payload).length !== 3 || !msg.payload.proposal || !msg.payload.choice || !msg.payload.metadata) {
      return sendError(res, 'wrong vote format');
    }

    if (typeof msg.payload.metadata !== 'object' || JSON.stringify(msg.payload.metadata).length > 1e4) {
      return sendError(res, 'wrong vote metadata');
    }

    const proposalRedis = await redis.hgetAsync(`token:${msg.token}:proposals`, msg.payload.proposal);
    const proposal = jsonParse(proposalRedis);
    if (!proposalRedis) {
      return sendError(res, 'unknown proposal');
    }

    if (ts > proposal.msg.payload.end || proposal.msg.payload.start > ts) {
      return sendError(res, 'not in voting window');
    }
  }

  const authorIpfsRes = await pinJson(`${ns}/${body.sig}`, {
    address: body.address,
    msg: body.msg,
    sig: body.sig,
    version: '2',
  });

  const relayerSig = await relayer.signMessage(authorIpfsRes);
  const relayerIpfsRes = await pinJson(`${ns}/${relayerSig}`, {
    address: relayer.address,
    msg: authorIpfsRes,
    sig: relayerSig,
    version: '2',
  });

  if (msg.type === 'proposal') {
    await Promise.all([redisStoreProposal(msg.token, body, authorIpfsRes, relayerIpfsRes), mysqlStoreProposal(msg.token, body, authorIpfsRes, relayerIpfsRes)]);

    let message = `#${msg.token}\n\n`;
    message += `**${msg.payload.name}**\n\n`;
    message += `${msg.payload.body}\n\n`;
    message += `<https://ipfs.io/ipfs/${authorIpfsRes}>`;
    sendMessage(message);
  }

  if (msg.type === 'vote') {
    await Promise.all([redisStoreVote(msg.token, body, authorIpfsRes, relayerIpfsRes), mysqlStoreVote(msg.token, body, authorIpfsRes, relayerIpfsRes)]);
  }

  console.log(`Address "${body.address}"\n`, `Token "${msg.token}"\n`, `Type "${msg.type}"\n`, `IPFS hash "${authorIpfsRes}"`);

  return res.json({ ipfsHash: authorIpfsRes });
});

export default router;
