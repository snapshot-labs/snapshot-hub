import 'dotenv/config';
import { fallbackLogger, initLogger } from '@snapshot-labs/snapshot-sentry';
import cors from 'cors';
import express from 'express';
import api from './api';
import eip4824 from './eip4824';
import graphql from './graphql';
import { checkKeycard } from './helpers/keycard';
import log from './helpers/log';
import initMetrics from './helpers/metrics';
import rateLimit from './helpers/rateLimit';
import { initiateShutdown } from './helpers/shutdown';
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
app.use('/api/eip4824', eip4824);
app.use('/graphql', graphql);

fallbackLogger(app);
app.get('/*', (req, res) => res.redirect('/api'));

const server = app.listen(PORT, () =>
  log.info(`Started on: http://localhost:${PORT}`)
);

const gracefulShutdown = async (signal: string) => {
  log.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop all background processes (loops + database)
  await initiateShutdown();
  log.info('Background processes stopped.');

  // Close Express server
  server.close(() => {
    log.info('Express server closed.');
    log.info('Graceful shutdown completed.');
    process.exit(0);
  });

  // Fallback timeout for the entire shutdown process
  setTimeout(() => {
    log.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, 15000); // 15 seconds total shutdown timeout
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
