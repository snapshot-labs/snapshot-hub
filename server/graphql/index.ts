import { importSchema } from 'graphql-import';
import { buildSchema } from 'graphql';
import { spaces as registrySpaces } from '../helpers/spaces';
import db from '../helpers/mysql';
import { jsonParse } from '../helpers/utils';

const schemaFile = importSchema('./**/*.graphql');
export const schema = buildSchema(schemaFile);

export const rootValue = {
  timeline: async ({ spaces = [], first = 20, skip = 0 }) => {
    const ts = (Date.now() / 1e3).toFixed();
    if (spaces.length === 0) spaces = Object.keys(registrySpaces) as any;

    const query = `SELECT * FROM messages WHERE type = 'proposal' AND timestamp > ? AND space IN (?) ORDER BY timestamp DESC LIMIT ?, ?`;
    const msgs = await db.queryAsync(query, [1518473607, spaces, first, skip]);

    return msgs.map(msg => {
      const payload = jsonParse(msg.payload);
      const { start, end } = payload;
      let proposalState = 'pending';
      if (ts > start) proposalState = 'active';
      if (ts > end) proposalState = 'closed';

      const space = registrySpaces[msg.space];
      space.id = msg.space;
      space.private = space.private || false;
      space.about = space.about || '';
      space.members = space.members || [];

      return {
        id: msg.id,
        author: msg.address,
        timestamp: msg.timestamp,
        state: proposalState,
        start,
        end,
        snapshot: payload.snapshot,
        name: payload.name,
        body: payload.body,
        space
      };
    });
  }
};
