import path from 'path';
import fs from 'fs';
import { makeExecutableSchema } from 'graphql-tools';
import graphqlFields from 'graphql-fields';
import db from '../helpers/mysql';
import { formatProposal, formatSpace } from './helpers';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');

export const rootValue = {
  Query: {
    space: async (parent, { id }, context, info) => {
      const requestedFields = graphqlFields(info);
      console.log(requestedFields);
      const query = `
        SELECT * FROM spaces
        WHERE id = ? AND spaces.settings IS NOT NULL
        LIMIT 1
      `;
      try {
        const spaces = await db.queryAsync(query, [id]);
        return (
          spaces.map(space => formatSpace(space.id, space.settings))[0] || null
        );
      } catch (e) {
        console.log(e);
        return Promise.reject('request failed');
      }
    },

    spaces: async (parent, args) => {
      const params: any[] = [];

      let orderBy = args.orderBy || 'created_at';
      let orderDirection = args.orderDirection || 'desc';
      if (!['created_at', 'updated_at', 'id'].includes(orderBy))
        orderBy = 'created_at';
      orderDirection = orderDirection.toUpperCase();
      if (!['ASC', 'DESC'].includes(orderDirection)) orderDirection = 'DESC';

      const { first = 20, skip = 0 } = args;
      params.push(skip, first);

      const query = `
        SELECT * FROM spaces
        WHERE settings IS NOT NULL
        ORDER BY ${orderBy} ${orderDirection} LIMIT ?, ?
      `;
      try {
        const spaces = await db.queryAsync(query, params);
        return spaces.map(space => formatSpace(space.id, space.settings));
      } catch (e) {
        console.log(e);
        return Promise.reject('request failed');
      }
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
        return proposals.map(proposal => formatProposal(proposal))[0] || null;
      } catch (e) {
        console.log(e);
        return Promise.reject('request failed');
      }
    },

    proposals: async (parent, args) => {
      // const requestedFields = graphqlFields(info);
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
