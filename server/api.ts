import express from 'express';
import redis from './redis';
import pinata from './pinata';
import relayer from "./relayer";
import { verify, jsonParse } from './utils';

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

  // @TODO msg validation

  const sigIsValid = await verify(body.address, body.msg, body.sig);
  if (!sigIsValid) {
    console.log('unauthorized');
    return res.status(500).json({ error: 'unauthorized' });
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
