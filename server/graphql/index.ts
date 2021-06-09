import { ApolloServer } from 'apollo-server-express';
import path from 'path';
import fs from 'fs';
import { makeExecutableSchema } from 'graphql-tools';
import { queryCountLimit } from './../helpers/utils';
import Query from './operations';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');
const rootValue = { Query };
const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });

const server = new ApolloServer({
  schema,
  rootValue,
  playground: {
    // @ts-ignore
    shareEnabled: true
  },
  tracing: true,
  validationRules: [queryCountLimit(5, 5)]
});

export default server;
