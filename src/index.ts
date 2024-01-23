import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initLogger, fallbackLogger } from '@snapshot-labs/snapshot-sentry';
import api from './api';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import log from './helpers/log';
import initMetrics from './helpers/metrics';
import { checkKeycard } from './helpers/keycard';
import refreshSpacesCache from './helpers/spaces';
import './helpers/strategies';

const app = express();
const PORT = process.env.PORT || 3000;

initLogger(app);
initMetrics(app);
refreshSpacesCache();

app.disable('x-powered-by');
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(checkKeycard, rateLimit);
app.use('/api', api);
app.use('/graphql', graphql);

fallbackLogger(app);
app.get('/*', (req, res) => res.redirect('/api'));

app.listen(PORT, () => log.info(`Started on: http://localhost:${PORT}`));
