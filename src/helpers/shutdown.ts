import log from './log';

export type ShutdownFunction = () => Promise<void>;

let isShuttingDown = false;
const stopFunctions: ShutdownFunction[] = [];

export const getShutdownStatus = () => isShuttingDown;

export const registerStopFunction = (fn: ShutdownFunction) => {
  stopFunctions.push(fn);
};

export const initiateShutdown = async () => {
  isShuttingDown = true;

  // Execute all stop functions with individual error handling
  const results = await Promise.allSettled(stopFunctions.map(fn => fn()));

  // Log any failures but don't throw
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      log.error(`Stop function ${index} failed:`, result.reason);
    }
  });
};
