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
      const spaceKeys: string[] = Object.keys(registrySpaces);
      spaces = spaces.filter(space => spaceKeys.includes(space));
      if (spaces.length === 0) spaces = spaceKeys as any;

      let queryStr = '';
      const params: any[] = [1618473607, spaces];

      if (id) {
        queryStr += `AND id = ? `;
        params.push(id);
      }

      if (state === 'pending') {
        queryStr += 'AND start > ? ';
        params.push(ts);
      } else if (state === 'active') {
        queryStr += 'AND start < ? AND end > ? ';
        params.push(ts, ts);
      } else if (state === 'closed') {
        queryStr += 'AND end < ? ';
        params.push(ts);
      }

      params.push(skip, first);

      const query = `SELECT * FROM proposals WHERE timestamp > ? AND space IN (?) ${queryStr} ORDER BY timestamp DESC LIMIT ?, ?`;
      const proposals = await db.queryAsync(query, params);

      const authors = Array.from(new Set(proposals.map(msg => msg.address)));

      let users = {};
      if (requestedFields.author && requestedFields.author.profile) {
        users = await getProfiles(authors);
      }

      return proposals.map(proposal => {
        proposal.choices = jsonParse(proposal.choices, []);

        let proposalState = 'pending';
        if (ts > proposal.start) proposalState = 'active';
        if (ts > proposal.end) proposalState = 'closed';
        proposal.state = proposalState;

        proposal.author = {
          address: proposal.author,
          profile: users[proposal.author]
        };

        const space = clone(registrySpaces[proposal.space]);
        space.id = proposal.space;
        space.private = space.private || false;
        space.about = space.about || '';
        space.members = space.members || [];
        proposal.space = space;

        return proposal;
      });
    },
    votes: async (
      parent,
      { id, first = 10, skip = 0, address, spaces = [], proposal },
      context,
      info
    ) => {
      const requestedFields = graphqlFields(info);
      let queryStr = '';
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
      if (proposal) {
        queryStr += `AND payload like ?`;
        params.push(`%"proposal": "${proposal}"%`);
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
        let space = null;
        if (registrySpaces[msg.space]) {
          space = clone(registrySpaces[msg.space]);
          space.id = msg.space;
          space.private = space.private || false;
          space.about = space.about || '';
          space.members = space.members || [];
        }

        msg.space = space;
        msg.voter = {
          address: msg.address,
          profile: users[msg.address]
        };
        msg.proposalId = jsonParse(msg.payload).proposal;
        msg.choice = jsonParse(msg.payload).choice;
        delete msg.payload;
        return msg;
      });
    }
  }
};

export const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });
