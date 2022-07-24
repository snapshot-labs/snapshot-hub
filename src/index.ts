import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import api from './api';
import ingestor from './ingestor';
import graphql from './graphql';
import rateLimit from './helpers/rateLimit';
import './helpers/strategies';
import './events';

import * as shutter from '@shutter-network/shutter-crypto';
import {arrayify} from "@ethersproject/bytes";
import { toUtf8String } from '@ethersproject/strings';

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

shutter.init().then(async () => {
  const decryptionKey =
    '0x219BA688C8505178E50E7E4FEAEFA21BDA69172E71B980A365F6F873DC9B3AAA20076B6D92CB58B24D14B70789A0B37418A0508624C83A7C8E35ED0A8DBB0E4B';
  const decryptionKeyArr = arrayify(decryptionKey);
  console.log('OK!');
  const encryptedMsg =
    '0x1c894825b72a15d6a0d5333270bf82800d8acb294fc1316f2caa549263f4ceb820c42da9d6d4a89c06de78b0c8726b83f28630dffa96cbac199dfef42eb72f4a08b9eea2e8283b34aaddf6c64ba6e8480e0577f6c7ea0e235f2083bed802836f29c69d21eac847cf0330ccefba1bc75c3a954e7242e0812d4399171fd7547d4285efd11438cdc5fd9e19aa143aae1f076d3b71a1971b578226f37ea2950899f4c07a186fdfe4bee88669179317c00383c8b20a8d8a96ad581baf161dd0673ec2459b6ad5cfec7d24cf0ce4a55a88b66858503e2a37af71544222cc8482c9af65';
  const encryptedMsgArr = arrayify(encryptedMsg);
  console.log('OK@22');

  const decryptedMsg = await shutter.decrypt(encryptedMsgArr, decryptionKeyArr);
  console.log('OK@33');
  console.log('END', toUtf8String(decryptedMsg));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Started on: http://localhost:${PORT}`));
