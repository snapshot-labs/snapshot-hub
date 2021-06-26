import fetch from 'node-fetch';
global['fetch'] = fetch;
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import api from './routes/api';
import upload from './routes/upload';
import legacy from './routes/legacy';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import './events';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(rateLimit);
app.use('/api', api);
app.use('/api', upload);
app.use('/api', legacy);
app.use('/graphql', graphql);
app.get('/*', (req, res) => res.redirect('/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Started on: http://localhost:${PORT}`));
