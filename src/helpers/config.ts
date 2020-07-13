import config from '@/config.json';

let networkId = process.env.VUE_APP_NETWORK || 'kovan';
const domainName = window.location.hostname;
if (domainName === 'smartpool.dev') networkId = 'homestead';
if (domainName === 'kovan.smartpool.dev') networkId = 'kovan';
if (domainName === 'homestead.smartpool.dev') networkId = 'homestead';

export default config[networkId];
