import express from 'express';
import redis from './redis';
import pinata from './pinata';
import { verify, counterSign } from './utils';

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

router.post('/proposal', async (req, res) => {
  let { message } = req.body;
  const { token } = message;
  // @TODO message validation
  const sigIsValid = await verify(message, message.authors[0].sig, message.authors[0].address);
  if (!sigIsValid) {
    console.log('unauthorized');
    return res.status(500).json({ error: 'unauthorized' });
  }
  message = await counterSign(message);
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  delete message.payload.body;
  await redis.hmsetAsync(
    `token:${token}:proposals`,
    IpfsHash,
    JSON.stringify(message)
  );
  return res.json({ ipfsHash: IpfsHash });
});

router.post('/vote', async (req, res) => {
  let { message } = req.body;
  const { token } = message;
  const proposalId = message.payload.proposal;
  // @TODO message validation
  const sigIsValid = await verify(message, message.authors[0].sig, message.authors[0].address);
  if (!sigIsValid) {
    console.log('unauthorized');
    return res.status(500).json({ error: 'unauthorized' });
  }
  message = await counterSign(message);
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  await redis.hmsetAsync(
    `token:${token}:proposal:${proposalId}:votes`,
    message.authors[0].address,
    JSON.stringify(message)
  );
  return res.json({ ipfsHash: IpfsHash });
});

export default router;
