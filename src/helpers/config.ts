import config from '@/config.json';

const networkId = process.env.VUE_APP_NETWORK || 'kovan';

export default config[networkId];
