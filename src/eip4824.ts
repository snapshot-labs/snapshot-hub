import express from 'express';
import { getSpace } from './helpers/spaces';
import db, { sequencerDB } from './helpers/mysql';

const router = express.Router();

router.get('/:space', async (req, res) => {
  let space: any = {};
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('X-Forwarded-Host') || req.get('host');
  const baseUrl = `${protocol}://${host}${req.originalUrl}`;

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(404).json({ error: 'INVALID' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: 'NOT_FOUND' });
  }

  return res.json({
    '@context': 'http://www.daostar.org/schemas',
    type: 'DAO',
    name: space.name,
    description: space.about ?? '',
    membersURI: `${baseUrl}/members`,
    proposalsURI: `${baseUrl}/proposals`,
    activityLogURI: `${baseUrl}/activities`,
    governanceURI: space.website,
    contractsURI: `${baseUrl}/contracts`
  });
});

router.get('/:space/members', async (req, res) => {
  let space: any = {};

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(404).json({ error: 'INVALID' });
  } catch (e) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

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
  let space: any = {};
  let proposals: any[] = [];

  try {
    space = await getSpace(id);

    if (!space.verified) return res.status(404).json({ error: 'INVALID' });

    proposals = await db.queryAsync(
      'SELECT id, title, start, end FROM proposals WHERE space = ? ORDER BY created DESC LIMIT 20',
      [id]
    );
  } catch (e) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

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
  let space: any = {};
  let messages: any[] = [];

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(404).json({ error: 'INVALID' });

    messages = await sequencerDB.queryAsync(
      'SELECT id, type, address FROM messages WHERE space = ? ORDER BY timestamp DESC LIMIT 20',
      [id]
    );
  } catch (e) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

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
  let space: any = {};

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(404).json({ error: 'INVALID' });
  } catch (e) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

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
