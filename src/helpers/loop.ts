import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import {
  getShutdownStatus,
  registerStopFunction,
  ShutdownFunction
} from './shutdown';

interface LoopOptions {
  name: string;
  interval: number;
  task: () => Promise<void>;
  maxConsecutiveFailsBeforeCapture?: number;
}

export const createLoop = (options: LoopOptions): ShutdownFunction => {
  const {
    name,
    interval,
    task,
    maxConsecutiveFailsBeforeCapture = 1
  } = options;
  let isRunning = false;
  let consecutiveFailsCount = 0;

  const run = async () => {
    isRunning = true;
    while (!getShutdownStatus() && isRunning) {
      try {
        log.info(`[${name}] Start ${name} refresh`);
        await task();
        consecutiveFailsCount = 0; // Reset on success
        log.info(`[${name}] End ${name} refresh`);
      } catch (e: any) {
        consecutiveFailsCount++;

        if (consecutiveFailsCount >= maxConsecutiveFailsBeforeCapture) {
          capture(e);
        }
        log.error(`[${name}] failed to refresh, ${JSON.stringify(e)}`);
      }
      await snapshot.utils.sleep(interval);
    }
  };

  const stop = async () => {
    isRunning = false;
  };

  // Register stop function and start the loop
  registerStopFunction(stop);
  run();

  return stop;
};
