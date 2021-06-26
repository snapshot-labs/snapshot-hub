import personalSign from './personalSign';
import typedData from './typedData';

export default async function(body, version) {
  if (process.env.MAINTENANCE)
    return Promise.reject('update in progress, try later');

  try {
    if (version === 'personal-sign') {
      return await personalSign(body);
    } else if (version === 'typed-data') {
      return await typedData(body);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}
