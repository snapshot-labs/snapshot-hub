import express from 'express';
import redis from './redis';
import pinata from './pinata';
import relayer from './relayer';

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
  const proposal = await redis.getAsync(`token:${token}:proposal:${id}`);
  const votes = await redis.hgetallAsync(`token:${token}:proposal:${id}:votes`);
  return res.json({
    proposal: JSON.parse(proposal),
    votes: Object.fromEntries(Object.entries(votes).map(vote => {
      // @ts-ignore
      vote[1] = JSON.parse(vote[1]);
      return vote;
    }))
  });
});

router.post('/proposal', async (req, res) => {
  const message = req.body.message;
  const { token } = message;
  // @TODO message validation
  const proposalId = await redis.incrAsync(`token:${token}:proposal:index`);
  message.id = proposalId;
  message.relayerSig = await relayer.signMessage(JSON.stringify(message));
  const { IpfsHash } = await pinata.pinJSONToIPFS(message);
  message.ipfsHash = IpfsHash;
  const result = await redis.setAsync(`token:${token}:proposal:${proposalId}`, JSON.stringify(message));
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
