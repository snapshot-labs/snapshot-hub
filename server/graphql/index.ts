import path from 'path';
import fs from 'fs';
import { makeExecutableSchema } from 'graphql-tools';
import graphqlFields from 'graphql-fields';
import { spaces as registrySpaces } from '../helpers/spaces';
import db from '../helpers/mysql';
import { clone, jsonParse } from '../helpers/utils';
import { getProfiles } from '../helpers/profile';
import { formatProposal } from './helpers';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');

export const rootValue = {
  Query: {
    timeline: async (
      parent,
      {
        id,
        first = 20,
        skip = 0,
        spaces = [],
        state,
        orderBy = 'timestamp',
        orderDirection = 'desc'
      },
      context,
      info
    ) => {
      const requestedFields = graphqlFields(info);
      const ts = parseInt((Date.now() / 1e3).toFixed());

      const spaceKeys: string[] = Object.keys(registrySpaces);
      spaces = spaces.filter(space => spaceKeys.includes(space));

      let queryStr = '';
      const params: any[] = [spaces];

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

      if (!['timestamp', 'start', 'end'].includes(orderBy))
        orderBy = 'timestamp';
      orderDirection = orderDirection.toUpperCase();
      if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

      params.push(skip, first);

      const query = `
        SELECT * FROM view_proposals
        WHERE space IN (?) ${queryStr}
        ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
      `;
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

    proposal: async (parent, { id }) => {
      const query = `
        SELECT p.*, spaces.settings FROM proposals p
        INNER JOIN spaces ON spaces.id = p.space
        WHERE p.id = ? AND spaces.settings IS NOT NULL
        LIMIT 1
      `;
      try {
        const proposals = await db.queryAsync(query, [id]);
        return proposals.map(proposal => formatProposal(proposal))[0] || [];
      } catch (e) {
        console.log(e);
        return Promise.reject('request failed');
      }
    },

    proposals: async (parent, args, context, info) => {
      const requestedFields = graphqlFields(info);
      console.log(JSON.stringify(requestedFields));

      const { where = {} } = args;
      const ts = parseInt((Date.now() / 1e3).toFixed());
      let queryStr = '';
      const params: any[] = [];

      const spaceIn = where.space_in || [];
      if (spaceIn.length > 0) {
        queryStr += `AND p.space IN (?) `;
        params.push(spaceIn);
      }

      const id = where.id || null;
      if (id) {
        queryStr += `AND p.id = ? `;
        params.push(id);
      }

      const idIn = where.id_in || [];
      if (idIn.length > 0) {
        queryStr += `AND p.id IN (?)`;
        params.push(idIn);
      }

      const state = where.state || null;
      if (state === 'pending') {
        queryStr += 'AND p.start > ? ';
        params.push(ts);
      } else if (state === 'active') {
        queryStr += 'AND p.start < ? AND p.end > ? ';
        params.push(ts, ts);
      } else if (state === 'closed') {
        queryStr += 'AND p.end < ? ';
        params.push(ts);
      }

      let orderBy = args.orderBy || 'created';
      let orderDirection = args.orderDirection || 'desc';
      if (!['created', 'start', 'end'].includes(orderBy)) orderBy = 'created';
      orderBy = `p.${orderBy}`;
      orderDirection = orderDirection.toUpperCase();
      if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

      const { first = 20, skip = 0 } = args;
      params.push(skip, first);

      const query = `
        SELECT p.*, spaces.settings FROM proposals p
        INNER JOIN spaces ON spaces.id = p.space
        WHERE spaces.settings IS NOT NULL ${queryStr}
        ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
      `;
      try {
        const proposals = await db.queryAsync(query, params);
        return proposals.map(proposal => formatProposal(proposal));
      } catch (e) {
        console.log(e);
        return Promise.reject('request failed');
      }
    }
  }
};

export const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });
