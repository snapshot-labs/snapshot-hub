import express from 'express';
import { getCombinedMembersAndVoters, getSpace } from './helpers/spaces';
import db, { sequencerDB } from './helpers/mysql';

const router = express.Router();
const context = ['https://snapshot.org', 'https://daostar.org/schemas'];

router.get('/:space', async (req, res) => {
  let space: any = {};
  const protocol = req.get('X-Forwarded-Proto') || req.protocol;
  const host = req.get('X-Forwarded-Host') || req.get('host');
  const baseUrl = `${protocol}://${host}${req.originalUrl}`;

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(400).json({ error: 'INVALID' });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: 'NOT_FOUND' });
  }

  return res.json({
    '@context': context,
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
  try {
    const spaceId = req.params.space;
    const cursor = req.query.cursor || null;  
    const pageSize = 500; // Default page size

    const space = await getSpace(spaceId);
    if (!space.verified) {
      return res.status(400).json({
        error: 'INVALID_SPACE',
        message: 'The specified space is not verified.'
      });
    }

    let members: { type: string, id: string }[] = []; 
    let nextCursor: string | null = null; 

    if (cursor) {
      const combinedMembersResult = await getCombinedMembersAndVoters(
        spaceId,
        cursor,
        pageSize,
        [], 
        [], 
        []  
      );
      members = combinedMembersResult.members.map(voter => ({ type: 'EthereumAddress', id: voter }));
      nextCursor = combinedMembersResult.nextCursor; 
    } else {
      const combinedMembersResult = await getCombinedMembersAndVoters(
        spaceId,
        cursor,
        pageSize,
        space.admins,
        space.moderators,
        space.members
      );
      members = [
        ...space.admins.map(admin => ({ type: 'EthereumAddress', id: admin })),
        ...space.moderators.map(moderator => ({ type: 'EthereumAddress', id: moderator })),
        ...space.members.map(member => ({ type: 'EthereumAddress', id: member })),
        ...combinedMembersResult.members.map(voter => ({ type: 'EthereumAddress', id: voter }))
      ];
      nextCursor = combinedMembersResult.nextCursor; 
    }

    const responseObject = {
      '@context': context,
      type: 'DAO',
      name: space.name,
      members: members,
      nextCursor: nextCursor 
    };

    return res.json(responseObject);
  } catch (e) {
    const error = e as Error;
    console.error(error);

    if (error.message.includes('database')) {
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to retrieve data from the database.'
      });
    } else if (error.message.includes('parameter')) {
      return res.status(400).json({
        error: 'INVALID_PARAMETER',
        message: 'Invalid or missing parameter.'
      });
    } else {
      return res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.'
      });
    }
  }
});


router.get('/:space/proposals', async (req, res) => {
  const id = req.params.space;
  let space: any = {};
  let proposals: any[] = [];

  try {
    space = await getSpace(id);

    if (!space.verified) return res.status(400).json({ error: 'INVALID' });

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
    '@context': context,
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

    if (!space.verified) return res.status(400).json({ error: 'INVALID' });

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
    '@context': context,
    type: 'DAO',
    name: space.name,
    activities
  });
});

router.get('/:space/contracts', async (req, res) => {
  let space: any = {};

  try {
    space = await getSpace(req.params.space);

    if (!space.verified) return res.status(400).json({ error: 'INVALID' });
  } catch (e) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const contracts = space.treasuries.map(treasury => ({
    type: 'EthereumAddress',
    id: treasury.address,
    name: treasury.name
  }));

  return res.json({
    '@context': context,
    type: 'DAO',
    name: space.name,
    contracts
  });
});

export default router;
