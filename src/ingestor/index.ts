import express from 'express';
import typedData from './ingestor';
import { sendError } from '../helpers/utils';
import log from '../helpers/log';

const router = express.Router();

const maintenanceMsg = 'update in progress, try later';

router.post('/message', async (req, res) => {
  return sendError(res, 'personal sign is not supported anymore');
});

router.post('/msg', async (req, res) => {
  if (process.env.MAINTENANCE) return sendError(res, maintenanceMsg);
  try {
    const result = await typedData(req.body);
    return res.json(result);
  } catch (e) {
    log.warn(`[ingestor] msg validation failed (typed data) ${JSON.stringify(e)}`);
    return sendError(res, e);
  }
});

export default router;
