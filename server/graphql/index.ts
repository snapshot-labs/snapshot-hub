import { importSchema } from 'graphql-import';
import { buildSchema } from 'graphql';
import { spaces as registrySpaces } from '../helpers/spaces';
import db from '../helpers/mysql';
import { jsonParse } from '../helpers/utils';
import { getProfiles } from '../helpers/profile';

const schemaFile = importSchema('./**/*.graphql');
export const schema = buildSchema(schemaFile);

export const rootValue = {
  timeline: async ({ spaces = [], first = 10, skip = 0, state }) => {
    const ts = parseInt((Date.now() / 1e3).toFixed());
    if (spaces.length === 0) spaces = Object.keys(registrySpaces) as any;

    const params: any[] = [1614473607, spaces];

    let stateStr = '';
    if (state === 'pending') {
      stateStr = 'AND JSON_EXTRACT(payload, "$.start") > ?';
      params.push(ts);
    }
    if (state === 'active') {
      stateStr =
        'AND JSON_EXTRACT(payload, "$.start") < ? AND JSON_EXTRACT(payload, "$.end") > ?';
      params.push(ts, ts);
    }
    if (state === 'closed') {
      stateStr = 'AND ? > JSON_EXTRACT(payload, "$.end")';
      params.push(ts);
    }

    params.push(skip, first);

    const query = `SELECT * FROM messages WHERE type = 'proposal' AND timestamp > ? AND space IN (?) ${stateStr} ORDER BY timestamp DESC LIMIT ?, ?`;
    const msgs = await db.queryAsync(query, params);

    const authors = Array.from(new Set(msgs.map(msg => msg.address)));
    const users = await getProfiles(authors);

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
        author: users[msg.address],
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
