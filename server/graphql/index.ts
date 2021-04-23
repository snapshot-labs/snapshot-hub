import path from 'path';
import fs from 'fs';
import { makeExecutableSchema } from 'graphql-tools';
import graphqlFields from 'graphql-fields';
import { spaces as registrySpaces } from '../helpers/spaces';
import db from '../helpers/mysql';
import { clone, jsonParse } from '../helpers/utils';
import { getProfiles } from '../helpers/profile';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');

export const rootValue = {
  Query: {
    timeline: async (
      parent,
      { id, first = 20, skip = 0, spaces = [], state },
      context,
      info
    ) => {
      const requestedFields = graphqlFields(info);

      const ts = parseInt((Date.now() / 1e3).toFixed());
      if (spaces.length === 0) spaces = Object.keys(registrySpaces) as any;
      let queryStr = '';
      const params: any[] = [1614473607, spaces];

      if (id) {
        queryStr += `AND id = ? `;
        params.push(id);
      }

      if (state === 'pending') {
        queryStr += 'AND JSON_EXTRACT(payload, "$.start") > ? ';
        params.push(ts);
      }
      if (state === 'active') {
        queryStr +=
          'AND JSON_EXTRACT(payload, "$.start") < ? AND JSON_EXTRACT(payload, "$.end") > ? ';
        params.push(ts, ts);
      }
      if (state === 'closed') {
        queryStr += 'AND ? > JSON_EXTRACT(payload, "$.end") ';
        params.push(ts);
      }

      params.push(skip, first);

      const query = `SELECT * FROM messages WHERE type = 'proposal' AND timestamp > ? AND space IN (?) ${queryStr} ORDER BY timestamp DESC LIMIT ?, ?`;
      const msgs = await db.queryAsync(query, params);

      const authors = Array.from(new Set(msgs.map(msg => msg.address)));

      let users = {};
      if (requestedFields.author && requestedFields.author.profile) {
        users = await getProfiles(authors);
      }

      return msgs.map(msg => {
        const payload = jsonParse(msg.payload);
        const { start, end } = payload;
        let proposalState = 'pending';
        if (ts > start) proposalState = 'active';
        if (ts > end) proposalState = 'closed';

        const space = clone(registrySpaces[msg.space]);
        space.id = msg.space;
        space.private = space.private || false;
        space.about = space.about || '';
        space.members = space.members || [];

        return {
          id: msg.id,
          author: {
            address: msg.address,
            profile: users[msg.address]
          },
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
    },
    votes: async (
      parent,
      { 
        id,
        first = 10,
        skip = 0,
        address,
        spaces=[],
        proposal
      },
      context,
      info
    ) => {
      const requestedFields = graphqlFields(info);
      let queryStr = "";
      const params: any[] = [];
      if (id) {
        queryStr += `AND id = ? `;
        params.push(id);
      }
      if (address) {
        queryStr += `AND address = ? `;
        params.push(address);
      }
      if (spaces.length) {
        queryStr += `AND space IN (?) `;
        params.push(spaces);
      }
      if(proposal) {
        queryStr += `AND payload like '%"proposal": "${proposal}"%' `;
      }
      params.push(skip, first);

      const query = `SELECT id, timestamp, space, payload, address FROM messages WHERE type = 'vote' ${queryStr} ORDER BY timestamp DESC LIMIT ?, ?`;
      const messages = await db.queryAsync(query, params);

      const voters = Array.from(new Set(messages.map(msg => msg.address)));

      let users = {};
      if (requestedFields.voter && requestedFields.voter.profile) {
        users = await getProfiles(voters);
      }
      return messages.map(msg => {
        msg.spaceId = msg.space;
        msg.voter = {
          address: msg.address,
          profile: users[msg.address]
        }
        msg.proposalId = jsonParse(msg.payload).proposal;
        msg.choice = jsonParse(msg.payload).choice;
        delete msg.payload
        return msg
      });
    }
  }
};

export const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });
