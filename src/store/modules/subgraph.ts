import Vue from 'vue';
import { request } from '@/helpers/subgraph';

const state = {
  balancer: {},
  poolShares: {},
  myPools: [],
  tokenPrices: {}
};

const getters = {
  getPrice: state => (token, amount) => {
    const tokenPrice = state.tokenPrices[token.toLowerCase()];
    if (!tokenPrice) return 0;
    return tokenPrice.price * amount;
  }
};

const mutations = {
  GET_BALANCER_REQUEST() {
    console.debug('GET_BALANCER_REQUEST');
  },
  GET_BALANCER_SUCCESS(_state, payload) {
    Vue.set(_state, 'balancer', payload);
    console.debug('GET_BALANCER_SUCCESS');
  },
  GET_BALANCER_FAILURE(_state, payload) {
    console.debug('GET_BALANCER_FAILURE', payload);
  },
  GET_TOKEN_PRICES_REQUEST() {
    console.debug('GET_TOKEN_PRICES_REQUEST');
  },
  GET_TOKEN_PRICES_SUCCESS(_state, payload) {
    Vue.set(_state, 'tokenPrices', payload);
    console.debug('GET_TOKEN_PRICES_SUCCESS');
  },
  GET_TOKEN_PRICES_FAILURE(_state, payload) {
    console.debug('GET_TOKEN_PRICES_FAILURE', payload);
  },
  GET_MY_POOLS_SHARES_REQUEST() {
    console.debug('GET_MY_POOLS_SHARES_REQUEST');
  },
  GET_MY_POOLS_SHARES_SUCCESS(_state, payload) {
    Vue.set(_state, 'poolShares', payload);
    console.debug('GET_MY_POOLS_SHARES_SUCCESS');
  },
  GET_MY_POOLS_SHARES_FAILURE(_state, payload) {
    console.debug('GET_MY_POOLS_SHARES_FAILURE', payload);
  }
};

const actions = {
  getBalancer: async ({ commit }) => {
    commit('GET_BALANCER_REQUEST');
    try {
      const { balancer } = await request('getBalancer');
      balancer.privatePoolCount =
        balancer.poolCount - balancer.finalizedPoolCount;
      commit('GET_BALANCER_SUCCESS', balancer);
    } catch (e) {
      commit('GET_BALANCER_FAILURE', e);
    }
  },
  getTokenPrices: async ({ commit }) => {
    commit('GET_TOKEN_PRICES_REQUEST');
    try {
      let { tokenPrices } = await request('getTokenPrices');
      tokenPrices = Object.fromEntries(
        tokenPrices
          .sort((a, b) => b.poolLiquidity - a.poolLiquidity)
          .map(tokenPrice => [tokenPrice.id, tokenPrice])
      );
      commit('GET_TOKEN_PRICES_SUCCESS', tokenPrices);
    } catch (e) {
      commit('GET_TOKEN_PRICES_FAILURE', e);
    }
  },
  getMyPoolShares: async ({ commit, rootState }) => {
    const address = rootState.web3.account;
    commit('GET_MY_POOLS_SHARES_REQUEST');
    try {
      const query = {
        poolShares: {
          __args: {
            where: {
              userAddress: address.toLowerCase()
            }
          }
        }
      };
      const { poolShares } = await request('getMyPoolShares', query);
      const balances: any = {};
      poolShares.forEach(
        share => (balances[share.poolId.id] = parseFloat(share.balance))
      );
      commit('GET_MY_POOLS_SHARES_SUCCESS', balances);
      return poolShares;
    } catch (e) {
      commit('GET_MY_POOLS_SHARES_FAILURE', e);
    }
  }
};

export default {
  state,
  getters,
  mutations,
  actions
};
