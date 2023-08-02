import { sha256 } from './utils';

const ongoingRequests = new Map();

export default async function serve(id, action, args) {
  const key = sha256(id);
  if (!ongoingRequests.has(key)) {
    const requestPromise = action(...args)
      .then(result => {
        ongoingRequests.delete(key);
        return result;
      })
      .catch(e => {
        console.log('EventEmitter Error', e);
        ongoingRequests.delete(key);
        throw { error: true, e };
      });
    ongoingRequests.set(key, requestPromise);
  }

  return ongoingRequests.get(key);
}
