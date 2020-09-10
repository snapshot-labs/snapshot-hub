const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      protocol: 'http',
      host: 'localhost',
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: '*',
    },
    kovan: {
      provider: () => new HDWalletProvider(
        "6552de8a31cd6757bf90e1315f6aff030a2a6e8e3688270c6d8b7bd58ce50f5d", 
        `https://kovan.infura.io/v3/c25f0edce61e4fc0976f868665b63f58`
      ),
      networkId: 42,
      gasPrice: 10e9
    }
  },
};
