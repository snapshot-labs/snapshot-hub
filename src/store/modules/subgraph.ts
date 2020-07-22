import { request } from '@/helpers/subgraph';
import { getAddress } from '@ethersproject/address';

const mutations = {
  GET_VOTING_POWER_REQUEST() {
    console.debug('GET_VOTING_POWER_REQUEST');
  },
  GET_VOTING_POWER_SUCCESS() {
    console.debug('GET_VOTING_POWER_SUCCESS');
  },
  GET_VOTING_POWER_FAILURE(_state, payload) {
    console.debug('GET_VOTING_POWER_FAILURE', payload);
  },
  GET_VOTING_POWERS_REQUEST() {
    console.debug('GET_VOTING_POWERS_REQUEST');
  },
  GET_VOTING_POWERS_SUCCESS() {
    console.debug('GET_VOTING_POWERS_SUCCESS');
  },
  GET_VOTING_POWERS_FAILURE(_state, payload) {
    console.debug('GET_VOTING_POWERS_FAILURE', payload);
  }
};

const actions = {
  getVotingPower: async (
    { commit, rootState, dispatch },
    { snapshot, token }
  ) => {
    const address = rootState.web3.account;
    commit('GET_VOTING_POWER_REQUEST');
    try {
      const { poolShares } = await request('getVotingPower', {
        poolShares: {
          __args: {
            block: {
              number: parseInt(snapshot)
            },
            where: {
              userAddress: address.toLowerCase()
            }
          }
        }
      });
      const bptBalances: any = {};
      poolShares.forEach(poolShare =>
        poolShare.poolId.tokens.map(token => {
          const [, address] = token.id.split('-');
          const shares =
            (token.balance / poolShare.poolId.totalShares) * poolShare.balance;
          bptBalances[address] = bptBalances[address]
            ? bptBalances[address] + shares
            : shares;
        })
      );
      const bptBalance = bptBalances[token.toLowerCase()] || 0;
      const balance = parseFloat(
        await dispatch('getBalance', { snapshot, token })
      );
      const total = bptBalance + balance;
      commit('GET_VOTING_POWER_SUCCESS');
      return { balance, bptBalance, total };
    } catch (e) {
      commit('GET_VOTING_POWER_FAILURE', e);
    }
  },
  getVotingPowers: async ({ commit }, { snapshot, token, addresses }) => {
    commit('GET_VOTING_POWERS_REQUEST');
    try {
      const { poolShares } = await request('getVotingPowers', {
        poolShares: {
          __args: {
            block: {
              number: parseInt(snapshot)
            },
            where: {
              userAddress_in: addresses.map(address => address.toLowerCase())
            }
          }
        }
      });
      const votingPowers: any = Object.fromEntries(
        addresses.map(address => [address, 0])
      );
      poolShares.forEach(poolShare =>
        poolShare.poolId.tokens.map(poolToken => {
          const [, tokenAddress] = poolToken.id.split('-');
          if (tokenAddress === token.toLowerCase()) {
            const userAddress = getAddress(poolShare.userAddress.id);
            const shares =
              (poolToken.balance / poolShare.poolId.totalShares) *
              poolShare.balance;
            votingPowers[userAddress] = votingPowers[userAddress] + shares;
          }
        })
      );
      commit('GET_VOTING_POWERS_SUCCESS');
      return votingPowers;
    } catch (e) {
      commit('GET_VOTING_POWERS_FAILURE', e);
    }
  }
};

export default {
  mutations,
  actions
};
