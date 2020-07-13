class Client {
  request(command, body?) {
    const url = `${process.env.VUE_APP_REST_API}/api/${command}`;
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
    return fetch(url, init).then(res => res.json());
  }
}

const client = new Client();

export default client;
