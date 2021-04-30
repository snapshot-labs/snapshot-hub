import bodyParser from 'body-parser';
import frameguard from 'frameguard';
import cors from 'cors';
import { graphqlHTTP } from 'express-graphql';
import rateLimit from 'express-rate-limit';
import api from './server';
import { schema, rootValue } from './server/graphql';
import defaultQuery from './server/graphql/examples';
import { sendError } from './server/helpers/utils';

export default app => {
  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
  app.use(frameguard({ action: 'deny' }));
  app.use(cors());
  app.set('trust proxy', 1);
  app.use(rateLimit({
    windowMs: 30 * 1000,
    max: 120,
    handler: (req, res) => {
      console.log('Rate limited');
      sendError(res, 'rate limited')
    }
  }));
  app.use('/api', api);
  app.use(
    '/graphql',
    graphqlHTTP({ schema, rootValue, graphiql: { defaultQuery } })
  );
  app.get('/*', (req, res) => res.redirect('/api'));
};
