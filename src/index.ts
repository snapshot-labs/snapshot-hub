import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rpc from './rpc';

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: false }));
app.use(cors({ maxAge: 86400 }));
app.set('trust proxy', 1);
app.use('/api', rpc);
app.get('/*', (req, res) => res.redirect('/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Started on: http://localhost:${PORT}`));
