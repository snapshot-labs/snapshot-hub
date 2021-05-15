import path from 'path';
import fs from 'fs';
import { makeExecutableSchema } from 'graphql-tools';
import Query from './operations';

const schemaFile = path.join(__dirname, './schema.gql');
const typeDefs = fs.readFileSync(schemaFile, 'utf8');
export const rootValue = { Query };
export const schema = makeExecutableSchema({ typeDefs, resolvers: rootValue });
