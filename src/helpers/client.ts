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
    return new Promise((resolve, reject) => {
      fetch(url, init).then(res => {
        if (res.ok) return resolve(res.json());
        return reject();
      });
    });
  }
}

const client = new Client();

export default client;
