import dotenv from 'dotenv';
dotenv.config();
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import api from './routes/api';
import upload from './routes/upload';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import './events';

const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || '';

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(rateLimit);
app.use(BASE_PATH + '/api', api);
app.use(BASE_PATH + '/api', upload);
app.use(BASE_PATH + '/graphql', graphql);
app.get(BASE_PATH + '/*', (req, res) => res.redirect('/api'));

app.listen(PORT, () => console.log(`Started on: http://localhost:${PORT}${BASE_PATH}`));
