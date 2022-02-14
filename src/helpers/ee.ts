import events from 'events';
import { sha256 } from './utils';

const eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(1000); // https://stackoverflow.com/a/26176922

export default async function serve(id, action, args) {
  const key = sha256(id);
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    eventEmitter.once(key, data =>
      data.error ? reject(data.e) : resolve(data)
    );
    if (eventEmitter.listenerCount(key) === 1) {
      try {
        eventEmitter.emit(key, await action(...args));
      } catch (e) {
        eventEmitter.emit(key, { error: true, e });
      }
    }
  });
}
