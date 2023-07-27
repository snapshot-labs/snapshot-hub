import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import api from './api';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import log from './helpers/log';
import './helpers/strategies';
import { verifyKeyCard } from './helpers/keycard';
import './helpers/moderation';
import { initLogger, fallbackLogger } from './helpers/sentry';

const app = express();
const PORT = process.env.PORT || 3000;

initLogger(app);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(rateLimit);
app.use('/api', api);
app.use('/graphql', verifyKeyCard, graphql);

fallbackLogger(app);
app.get('/*', (req, res) => res.redirect('/api'));

app.listen(PORT, () => log.info(`Started on: http://localhost:${PORT}`));
