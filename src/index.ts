import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import api from './api';
import ingestor from './ingestor';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import './helpers/strategies';
import { getDecryptionKey } from './helpers/shutter';

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use(rateLimit);
app.use('/api', api);
app.use('/api', ingestor);
app.use('/graphql', graphql);
app.get('/*', (req, res) => res.redirect('/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Started on: http://localhost:${PORT}`));

async function test() {
  try {
    const proposal = '0x480184f2b2dedec2641fb1a0b8cb1f0a8af8e7edd90f2f5acfc0858c29ed964d';
    const result = await getDecryptionKey(proposal);
    console.log('Shutter', result);
  } catch (e) {
    console.log('Shutter', e);
  }
}

test();
