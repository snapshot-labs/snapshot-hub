import express from 'express';
import { getDefaultProvider } from '@ethersproject/providers';
import redis from './redis';
import pinata from './pinata';
import relayer from './relayer';
import { verify, jsonParse } from './utils';
const router = express.Router();

let currentBlockNumber: number = 0;

setInterval(async () => {
  const defaultProvider = getDefaultProvider();
  const blockNumber: any = await defaultProvider.getBlockNumber();
  currentBlockNumber = parseInt(blockNumber);
  await redis.setAsync('currentBlockNumber', currentBlockNumber);
  console.log('Block number', currentBlockNumber);
}, 8e3)

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

  if (
    !currentBlockNumber ||
    !body ||
    !body.address ||
    !body.msg ||
    !body.sig ||
    Object.keys(msg).length !== 4 ||
    !msg.version ||
    !msg.token ||
    !msg.type ||
    !['proposal', 'vote'].includes(msg.type) ||
    Object.keys(msg.payload).length === 0 ||
    msg.type === 'proposal' && (
      Object.keys(msg.payload).length !== 5 ||
      !msg.payload.name ||
      msg.payload.name.length > 128 ||
      !msg.payload.body ||
      msg.payload.body.length > 10240 ||
      !msg.payload.choices ||
      msg.payload.choices.length < 2 ||
      !msg.payload.startBlock ||
      currentBlockNumber > msg.payload.startBlock ||
      !msg.payload.endBlock ||
      msg.payload.startBlock >= msg.payload.endBlock
    ) ||
    msg.type === 'vote' && (
      Object.keys(msg.payload).length !== 2 ||
      !msg.payload.proposal ||
      !msg.payload.choice
    ) ||
    !await verify(body.address, body.msg, body.sig)
  ) {
    console.log('unauthorized', body);
    return res.status(500).json({ error: 'unauthorized' });
  }

  if (!await verify(body.address, body.msg, body.sig)) {
    console.log('wrong signature', body);
    return res.status(500).json({ error: 'wrong signature' });
  }

  if (msg.type === 'vote') {
    const proposalRedis = await redis.hgetAsync(`token:${msg.token}:proposals`, msg.payload.proposal);
    const proposal = jsonParse(proposalRedis);
    if (
      !proposalRedis ||
      currentBlockNumber > proposal.msg.payload.endBlock ||
      proposal.msg.payload.startBlock > currentBlockNumber
    ) {
      console.log('wrong vote', body);
      return res.status(500).json({ error: 'unauthorized' });
    }
  }

  const authorIpfsRes = await pinata.pinJSONToIPFS({
    address: body.address,
    msg: body.msg,
    sig: body.sig,
    version: '2'
  });

  const relayerIpfsRes = await pinata.pinJSONToIPFS({
    address: relayer.address,
    msg: authorIpfsRes.IpfsHash,
    sig: await relayer.signMessage(authorIpfsRes.IpfsHash),
    version: '2'
  });

  if (msg.type === 'proposal') {
    await redis.hmsetAsync(
      `token:${msg.token}:proposals`,
      authorIpfsRes.IpfsHash,
      JSON.stringify({
        address: body.address,
        msg,
        sig: body.sig,
        authorIpfsHash: authorIpfsRes.IpfsHash,
        relayerIpfsHash: relayerIpfsRes.IpfsHash
      })
    );
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
        authorIpfsHash: authorIpfsRes.IpfsHash,
        relayerIpfsHash: relayerIpfsRes.IpfsHash
      })
    );
  }

  console.log(
    `Address "${body.address}"\n`,
    `Token "${msg.token}"\n`,
    `Type "${msg.type}"\n`,
    `IPFS hash "${authorIpfsRes.IpfsHash}"`
  );

  return res.json({ ipfsHash: authorIpfsRes.IpfsHash });
});

export default router;
