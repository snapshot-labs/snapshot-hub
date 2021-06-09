import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import express from 'express';
import api from './server';
import upload from './server/upload';
import { schema, rootValue } from './server/graphql';
import { queryCountLimit, sendError } from './server/helpers/utils';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(
  rateLimit({
    windowMs: 10 * 1e3,
    max: 32,
    handler: (req, res) => {
      const id = createHash('sha256')
        .update(req.ip)
        .digest('hex');
      console.log('Too many requests', id.slice(0, 7));
      sendError(res, 'too many requests', 429);
    }
  })
);
app.use('/api', api);
app.use('/api', upload);

const PORT = process.env.PORT || 3000;
const server = new ApolloServer({
  schema,
  rootValue,
  playground: true,
  validationRules: [queryCountLimit(5, 5)]
});
server.start().then(() => {
  server.applyMiddleware({ app });
  app.get('/*', (req, res) => res.redirect('/api'));
  app.listen(PORT, () => {
    console.log(`Snapshot hub started on: http://localhost:${PORT}`);
    console.log(
      `Snapshot graphql api ready at http://localhost:${PORT}${server.graphqlPath}`
    );
  });
});
