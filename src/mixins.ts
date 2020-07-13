import store from '@/store';
import { mapGetters, mapState } from 'vuex';
import { shorten, trunc, etherscanLink } from '@/helpers/utils';

// @ts-ignore
const modules = Object.entries(store.state).map(module => module[0]);

export default {
  computed: {
    ...mapState(modules),
    ...mapGetters(['getPrice', 'hasProxy'])
  },
  methods: {
    _shorten(str: string): string {
      return shorten(str);
    },
    _trunc(value: number, decimals: number): number {
      return trunc(value, decimals);
    },
    _etherscanLink(str: string, type: string): string {
      return etherscanLink(str, type);
    },
    _ticker(address: string): string {
      // @ts-ignore
      const token = this.subgraph.tokenPrices[address];
      return token ? token.symbol : this._shorten(address);
    },
    _markdown(address: string): string {
      // @ts-ignore
      const token = this.subgraph.tokenPrices[address];
      return token ? token.symbol : this._shorten(address);
    }
  }
};
