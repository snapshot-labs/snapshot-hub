import express from 'express';
import redis from './redis';
import relayer from './relayer';
import { pinJson } from './ipfs';
import { verify, jsonParse, sendError } from './utils';
import { sendMessage } from './discord';
import pkg from '../package.json';

const router = express.Router();

router.get('/:token/proposals', async (req, res) => {
  const { token } = req.params;
  let proposals = await redis.hgetallAsync(`token:${token}:proposals`);
  if (!proposals) return res.json({});
  proposals = Object.fromEntries(Object.entries(proposals).map((proposal: any) => {
    proposal[1] = JSON.parse(proposal[1]);
    return proposal;
  }))
  return res.json(proposals);
});

router.get('/:token/proposal/:id', async (req, res) => {
  const { token, id } = req.params;
  let votes = await redis.hgetallAsync(`token:${token}:proposal:${id}:votes`) || {};
  if (votes)
    votes = Object.fromEntries(Object.entries(votes).map((vote: any) => {
      vote[1] = JSON.parse(vote[1]);
      return vote;
    }));
  return res.json(votes);
});

router.post('/message', async (req, res) => {
  const body = req.body;
  const msg = jsonParse(body.msg);
  const ts = (Date.now() / 1e3).toFixed();
  // const minBlock = (3600 * 24) / 15;

  if (!body || !body.address || !body.msg || !body.sig)
    return sendError(res, 'wrong message body');

  if (
    Object.keys(msg).length !== 5 ||
    !msg.token ||
    !msg.payload ||
    Object.keys(msg.payload).length === 0
  ) return sendError(res, 'wrong signed message');

  if (!msg.timestamp || typeof msg.timestamp !== 'string' || msg.timestamp > ts)
    return sendError(res, 'wrong timestamp');

  if (!msg.version || msg.version !== pkg.version)
    return sendError(res, 'wrong version');

  if (!msg.type || !['proposal', 'vote'].includes(msg.type))
    return sendError(res, 'wrong message type');

  if (!await verify(body.address, body.msg, body.sig))
    return sendError(res, 'wrong signature');

  if (msg.type === 'proposal') {
    if (
      Object.keys(msg.payload).length !== 6 ||
      !msg.payload.choices ||
      msg.payload.choices.length < 2 ||
      !msg.payload.snapshot
    ) return sendError(res, 'wrong proposal format');

    if (
      !msg.payload.name ||
      msg.payload.name.length > 256 ||
      !msg.payload.body ||
      msg.payload.body.length > 5e4
    ) return sendError(res, 'wrong proposal size');

    if (
      !msg.payload.start ||
      // ts > msg.payload.start ||
      !msg.payload.end ||
      msg.payload.start >= msg.payload.end
    ) return sendError(res, 'wrong proposal period');
  }

  if (msg.type === 'vote') {
    if (
      Object.keys(msg.payload).length !== 2 ||
      !msg.payload.proposal ||
      !msg.payload.choice
    ) return sendError(res, 'wrong vote format');

    const proposalRedis = await redis.hgetAsync(`token:${msg.token}:proposals`, msg.payload.proposal);
    const proposal = jsonParse(proposalRedis);
    if (!proposalRedis)
      return sendError(res, 'unknown proposal');
    if (
      ts > proposal.msg.payload.end ||
      proposal.msg.payload.start > ts
    ) return sendError(res, 'not in voting window');
  }

  const authorIpfsRes = await pinJson(`snapshot/${body.sig}`, {
    address: body.address,
    msg: body.msg,
    sig: body.sig,
    version: '2'
  });

  const relayerSig = await relayer.signMessage(authorIpfsRes);
  const relayerIpfsRes = await pinJson(`snapshot/${relayerSig}`, {
    address: relayer.address,
    msg: authorIpfsRes,
    sig: relayerSig,
    version: '2'
  });

  if (msg.type === 'proposal') {
    await redis.hmsetAsync(
      `token:${msg.token}:proposals`,
      authorIpfsRes,
      JSON.stringify({
        address: body.address,
        msg,
        sig: body.sig,
        authorIpfsHash: authorIpfsRes,
        relayerIpfsHash: relayerIpfsRes
      })
    );

    let message = `#${msg.token}\n\n`;
    message += `**${msg.payload.name}**\n\n`;
    message += `${msg.payload.body}\n\n`;
    message += `<https://ipfs.fleek.co/ipfs/${authorIpfsRes}>`;
    sendMessage(message);
  }

  if (msg.type === 'vote') {
    const proposalId = msg.payload.proposal;
    await redis.hmsetAsync(
      `token:${msg.token}:proposal:${proposalId}:votes`,
      body.address,
      JSON.stringify({
        address: body.address,
        msg,
        sig: body.sig,
        authorIpfsHash: authorIpfsRes,
        relayerIpfsHash: relayerIpfsRes
      })
    );
  }

  console.log(
    `Address "${body.address}"\n`,
    `Token "${msg.token}"\n`,
    `Type "${msg.type}"\n`,
    `IPFS hash "${authorIpfsRes}"`
  );

  return res.json({ ipfsHash: authorIpfsRes });
});

export default router;
