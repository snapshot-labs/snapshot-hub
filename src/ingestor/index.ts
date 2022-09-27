import personalSign from './personalSign';
import typedData from './typedData';
import express from 'express';
import { sendError } from '../helpers/utils';
import log from '../helpers/log';

const router = express.Router();

const maintenanceMsg = 'update in progress, try later';

router.post('/message', async (req, res) => {
  if (process.env.MAINTENANCE) return sendError(res, maintenanceMsg);
  try {
    const result = await personalSign(req.body);
    return res.json(result);
  } catch (e) {
    log.warn('[ingestor] msg validation failed (personal sign)', e);
    return sendError(res, e);
  }
});

router.post('/msg', async (req, res) => {
  if (process.env.MAINTENANCE) return sendError(res, maintenanceMsg);
  try {
    const result = await typedData(req.body);
    return res.json(result);
  } catch (e) {
    log.warn('[ingestor] msg validation failed (typed data)', e);
    return sendError(res, e);
  }
});

export default router;
