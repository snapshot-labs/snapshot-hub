import express from 'express';
import redis from './redis';
import pinata from './pinata';

const router = express.Router();

router.get('/:token/proposals', async (req, res) => {
  const { token } = req.params;
  const totalProposals = await redis.getAsync(`token:${token}:proposal:index`);
  const multi = redis.multi();
  const ids = [];
  let i = 1;
  while (i <= totalProposals) {
    multi.getAsync(`token:${token}:proposal:${i}`);
    // @ts-ignore
    ids.push(i);
    i++;
  }
  const result = await multi.execAsync();
  const proposals = Object.fromEntries(
    result.map((proposal, i) => [ids[i], JSON.parse(proposal)])
  );
  return res.json(proposals);
});

router.get('/:token/proposal/:id', async (req, res) => {
  const { token, id } = req.params;
  const multi = redis.multi();
  multi.getAsync(`token:${token}:proposal:${id}`);
  multi.getAsync(`token:${token}:proposal:${id}:vote:index`);
  const [proposal, totalVotes] = await multi.execAsync();
  return res.json(JSON.parse(proposal));
});

router.post('/proposal', async (req, res) => {
  const message = req.body.message;
  const { token } = message;
  // @TODO message validation
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  const proposalId = await redis.incrAsync(`token:${token}:proposal:index`);
  const result = await redis.setAsync(`token:${token}:proposal:${proposalId}`, JSON.stringify(message));
  return res.json({ result });
});

router.post('/vote', async (req, res) => {
  const message = req.body.message;
  const { token } = message;
  const proposalId = message.payload.proposal;
  // @TODO message validation
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  const voteId = await redis.incrAsync(`token:${token}:proposal:${proposalId}:vote:index`);
  const result = await redis.setAsync(`token:${token}:proposal:${proposalId}:vote:${voteId}`, JSON.stringify(message));
  return res.json({ result });
});

export default router;
