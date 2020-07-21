import { WebSocketProvider } from '@ethersproject/providers';

const wsProvider = new WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.VUE_APP_INFURA_ID}`
);

export default wsProvider;
