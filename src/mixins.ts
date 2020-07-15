import store from '@/store';
import { mapState } from 'vuex';
import { shorten, etherscanLink } from '@/helpers/utils';

// @ts-ignore
const modules = Object.entries(store.state).map(module => module[0]);

export default {
  computed: {
    ...mapState(modules)
  },
  methods: {
    _shorten(str: string): string {
      return shorten(str);
    },
    _ipfsUrl(ipfsHash: string): string {
      return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    },
    _etherscanLink(str: string, type: string): string {
      return etherscanLink(str, type);
    }
  }
};
