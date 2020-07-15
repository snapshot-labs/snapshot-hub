import express from 'express';
import redis from './redis';
import pinata from './pinata';
import relayer from './relayer';

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
  const proposal = await redis.hgetAsync(`token:${token}:proposals`, id);
  const votes = await redis.hgetallAsync(`token:${token}:proposal:${id}:votes`);
  const result = {
    proposal: JSON.parse(proposal),
    votes: {}
  }
  if (votes)
    result.votes = Object.fromEntries(Object.entries(votes).map((vote: any) => {
      vote[1] = JSON.parse(vote[1]);
      return vote;
    }));
  return res.json(result);
});

router.post('/proposal', async (req, res) => {
  const message = req.body.message;
  const { token } = message;
  // @TODO message validation
  message.relayerSig = await relayer.signMessage(JSON.stringify(message));
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  const result = await redis.hmsetAsync(
    `token:${token}:proposals`,
    IpfsHash,
    JSON.stringify(message)
  );
  return res.json({ result });
});

router.post('/vote', async (req, res) => {
  const message = req.body.message;
  const { token } = message;
  const proposalId = message.payload.proposal;
  // @TODO message validation
  message.relayerSig = await relayer.signMessage(JSON.stringify(message));
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  const result = await redis.hmsetAsync(
    `token:${token}:proposal:${proposalId}:votes`,
    message.authors[0],
    JSON.stringify(message)
  );
  return res.json({ result });
});

export default router;
