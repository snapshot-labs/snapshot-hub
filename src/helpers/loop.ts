import { capture } from '@snapshot-labs/snapshot-sentry';
import snapshot from '@snapshot-labs/snapshot.js';
import log from './log';
import {
  loopActiveTasksCount,
  loopDurationSeconds,
  loopErrorsTotal,
  loopIterationsTotal
} from './loop-metrics';
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
      loopIterationsTotal.inc({ loop_name: name });
      const endTimer = loopDurationSeconds.startTimer({
        loop_name: name
      });
      loopActiveTasksCount.inc({ loop_name: name });

      try {
        log.info(`[${name}] Start ${name} refresh`);
        await task();
        consecutiveFailsCount = 0;
        log.info(`[${name}] End ${name} refresh`);
      } catch (e: any) {
        consecutiveFailsCount++;
        loopErrorsTotal.inc({
          loop_name: name,
          error_type: e.name || 'UnknownError'
        });

        if (consecutiveFailsCount >= maxConsecutiveFailsBeforeCapture) {
          capture(e);
        }
        log.error(`[${name}] failed to refresh, ${JSON.stringify(e)}`);
      } finally {
        endTimer();
        loopActiveTasksCount.dec({ loop_name: name });
      }

      await snapshot.utils.sleep(interval);
    }
  };

  const stop = async () => {
    isRunning = false;
  };

  registerStopFunction(stop);
  run();

  return stop;
};
