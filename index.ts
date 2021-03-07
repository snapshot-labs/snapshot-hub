import bodyParser from 'body-parser';
import frameguard from 'frameguard';
import cors from 'cors';
import api from './server';
import express from 'express';

require('dotenv').config()

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: false }));
app.use(frameguard({ action: 'deny' }));
app.use(cors());
app.use('/api', api);
app.get('/*', (req, res) => res.redirect('https://snapshot.page/#/balancer'));


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`⚡⚡Server is running: https://localhost:${PORT}`));