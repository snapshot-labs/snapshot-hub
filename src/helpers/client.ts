let defaultRestApi = 'http://localhost:3000';
const domainName = window.location.hostname;
if (domainName === 'beta.vote.balancer.finance')
  defaultRestApi = 'https://beta.vote.balancer.finance';
if (domainName === 'vote.balancer.finance')
  defaultRestApi = 'https://vote.balancer.finance';
const restApi = process.env.VUE_APP_REST_API || defaultRestApi;

class Client {
  request(command, body?) {
    const url = `${restApi}/api/${command}`;
    let init;
    if (body) {
      init = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };
    }
    return new Promise((resolve, reject) => {
      fetch(url, init)
        .then(res => {
          if (res.ok) return resolve(res.json());
          throw res;
        })
        .catch(e => e.json().then(json => reject(json)));
    });
  }
}

const client = new Client();

export default client;
