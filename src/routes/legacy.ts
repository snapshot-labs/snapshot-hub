import express from 'express';
import { getAddress } from '@ethersproject/address';
// import { spaces } from '../helpers/spaces';
import db from '../helpers/mysql';

const router = express.Router();
const deprecationNotice =
  'This endpoint is deprecated, please use the GraphQL API instead.';

export function formatMessage(message) {
  const metadata = JSON.parse(message.metadata);
  return [
    message.id,
    {
      address: message.address,
      msg: {
        version: message.version,
        timestamp: message.timestamp.toString(),
        space: message.space,
        type: message.type,
        payload: JSON.parse(message.payload)
      },
      sig: message.sig,
      authorIpfsHash: message.id,
      relayerIpfsHash: metadata.relayer_ipfs_hash
    }
  ];
}

router.get('/:space/proposals', async (req, res) => {
  // return res.json({ error: deprecationNotice });
  const { space } = req.params;
  const query =
    "SELECT * FROM messages WHERE type = 'proposal' AND space = ? ORDER BY timestamp DESC LIMIT 100";
  const messages = await db.queryAsync(query, [space]);
  res.json(Object.fromEntries(messages.map(message => formatMessage(message))));
});

router.get('/:space/proposal/:id', async (req, res) => {
  // return res.json({ error: deprecationNotice });
  const { space, id } = req.params;
  const query = `
    SELECT v.* FROM votes v
    LEFT OUTER JOIN votes v2 ON
      v.voter = v2.voter AND v.proposal = v2.proposal
      AND ((v.created < v2.created) OR (v.created = v2.created AND v.id < v2.id))
    WHERE v2.voter IS NULL AND v.space = ? AND v.proposal = ?
    ORDER BY created ASC
  `;
  db.queryAsync(query, [space, id]).then(messages => {
    res.json(
      Object.fromEntries(
        messages.map(message => {
          const address = getAddress(message.voter);
          return [
            address,
            {
              address,
              msg: {
                timestamp: message.created.toString(),
                payload: {
                  choice: JSON.parse(message.choice),
                  metadata: JSON.parse(message.metadata),
                  proposal: message.proposal
                }
              },
              authorIpfsHash: message.id
            }
          ];
        })
      )
    );
  });
});

router.get('/voters', async (req, res) => {
  return res.json({ error: deprecationNotice });
  /*
  const { from = 0, to = 1e24 } = req.query;
  const spacesArr = req.query.spaces
    ? (req.query.spaces as string).split(',')
    : Object.keys(spaces);
  const query = `SELECT address, timestamp, space FROM messages WHERE type = 'vote' AND timestamp >= ? AND timestamp <= ? AND space IN (?) GROUP BY address ORDER BY timestamp DESC`;
  const messages = await db.queryAsync(query, [from, to, spacesArr]);
  res.json(messages);
  */
});

export default router;
