import { mapState } from 'vuex';
import numeral from 'numeral';
import store from '@/store';
import { shorten, etherscanLink } from '@/helpers/utils';

// @ts-ignore
const modules = Object.entries(store.state).map(module => module[0]);

export default {
  computed: {
    ...mapState(modules)
  },
  methods: {
    _blockNumberToTs(blockNumber) {
      // @ts-ignore
      const currentBlockNumber = this.web3.blockNumber;
      const blockTimestampDiff = (currentBlockNumber - blockNumber) * 14;
      // @ts-ignore
      return new Date((this.web3.blockTimestamp - blockTimestampDiff) * 1e3);
    },
    _numeral(number, format = '(0.[0]a)') {
      return numeral(number).format(format);
    },
    _shorten(str: string): string {
      return shorten(str);
    },
    _ipfsUrl(ipfsHash: string): string {
      return `https://${process.env.VUE_APP_IPFS_NODE}/ipfs/${ipfsHash}`;
    },
    _etherscanLink(str: string, type: string): string {
      return etherscanLink(str, type);
    }
  }
};
