import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import api from './api';
import ingestor from './ingestor';
import shutter from './helpers/shutter';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import log from './helpers/log';
import './helpers/strategies';

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(rateLimit);
app.use('/api', api);
app.use('/api', ingestor);
app.use('/api/shutter', shutter);
app.use('/graphql', graphql);
app.get('/*', (req, res) => res.redirect('/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log.info(`Started on: http://localhost:${PORT}`));
