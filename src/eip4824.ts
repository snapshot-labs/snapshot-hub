import express from 'express';
import { getSpace } from './helpers/spaces';
import db, { sequencerDB } from './helpers/mysql';

const router = express.Router();

router.get('/:space', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const space = await getSpace(req.params.space);

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    description: space.about,
    membersURI: `${baseUrl}/members`,
    proposalsURI: `${baseUrl}/proposals`,
    activityLogURI: `${baseUrl}/activities`,
    governanceURI: space.website,
    contractsURI: `${baseUrl}/contracts`
  });
});

router.get('/:space/members', async (req, res) => {
  const space = await getSpace(req.params.space);

  const members = [...space.admins, ...space.moderators, ...space.members].map(
    member => ({
      type: 'EthereumAddress',
      id: member
    })
  );

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    members
  });
});

router.get('/:space/proposals', async (req, res) => {
  const id = req.params.space;
  const space = await getSpace(id);
  let proposals = await db.queryAsync(
    'SELECT id, title, start, end FROM proposals WHERE space = ? ORDER BY created DESC LIMIT 20',
    [id]
  );

  const ts = Math.floor(Date.now() / 1000);
  proposals = proposals.map(proposal => ({
    type: 'proposal',
    id: proposal.id,
    name: proposal.title,
    status:
      ts > proposal.end ? 'closed' : ts > proposal.start ? 'active' : 'pending',
    calls: []
  }));

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    proposals
  });
});

router.get('/:space/activities', async (req, res) => {
  const id = req.params.space;
  const space = await getSpace(req.params.space);
  const messages = await sequencerDB.queryAsync(
    'SELECT id, type, address FROM messages WHERE space = ? ORDER BY timestamp DESC LIMIT 20',
    [id]
  );

  const activities = messages.map(message => ({
    id: message.id,
    type: message.type,
    member: {
      type: 'EthereumAddress',
      id: message.address
    }
  }));

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    activities
  });
});

router.get('/:space/contracts', async (req, res) => {
  const space = await getSpace(req.params.space);

  const contracts = space.treasuries.map(treasury => ({
    type: 'EthereumAddress',
    id: treasury.address,
    name: treasury.name
  }));

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    contracts
  });
});

export default router;
