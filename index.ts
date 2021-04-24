require('dotenv').config();

import bodyParser from 'body-parser';
import frameguard from 'frameguard';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import api from './server';
import { schema, rootValue } from './server/graphql';
import defaultQuery from './server/graphql/examples';
import express from 'express';
const app = express();

app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
app.use(frameguard({ action: 'deny' }));
app.use(cors());
app.use('/api', api);
app.use(
  '/graphql',
  graphqlHTTP({ schema, rootValue, graphiql: { defaultQuery } })
);
app.get('/*', (req, res) => res.redirect('/api'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`⚡⚡Server is running: http://localhost:${PORT}`)
);
