import { ApolloServer } from 'apollo-server-express';
import path from 'path';
import fs from 'fs';
import { queryCountLimit } from './../graphql/helpers';
import defaultQuery from '../graphql/examples';
import Query from './operations';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');
const rootValue = { Query };

const server = new ApolloServer({
  typeDefs,
  resolvers: rootValue,
  playground: {
    // @ts-ignore
    shareEnabled: true,
    tabs: [
      {
        endpoint:
          process.env.NODE_ENV === 'production'
            ? `https://{process.env.NETWORK === 'testnet' ? 'testnet' : 'hub'}.snapshot.org/graphql`
            : 'http://localhost:3000/graphql/',
        query: defaultQuery,
        name: 'Test Query'
      }
    ]
  },
  tracing: true,
  validationRules: [queryCountLimit(5, 5)]
});

export default server;
