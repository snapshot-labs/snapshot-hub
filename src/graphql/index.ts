import path from 'path';
import fs from 'fs';
import { graphqlHTTP } from 'express-graphql';
import { makeExecutableSchema } from 'graphql-tools';
import queryCountLimit from 'graphql-query-count-limit';
import Query from './operations';
import defaultQuery from './examples';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');
const rootValue = { Query };
const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });

export default graphqlHTTP({
  schema,
  rootValue,
  graphiql: { defaultQuery },
  validationRules: [queryCountLimit(5, 5)]
});
