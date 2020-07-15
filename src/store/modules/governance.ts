import client from '@/helpers/client';
import { ethers } from 'ethers';
import config from '@/helpers/config';
import abi from '@/helpers/abi';
import { formatEther, Interface } from 'ethers/utils';

const mutations = {
  POST_REQUEST() {
    console.debug('POST_REQUEST');
  },
  POST_SUCCESS() {
    console.debug('POST_SUCCESS');
  },
  POST_FAILURE(_state, payload) {
    console.debug('POST_FAILURE', payload);
  },
  VOTE_REQUEST() {
    console.debug('VOTE_REQUEST');
  },
  VOTE_SUCCESS() {
    console.debug('VOTE_SUCCESS');
  },
  VOTE_FAILURE(_state, payload) {
    console.debug('VOTE_FAILURE', payload);
  },
  GET_PROPOSALS_REQUEST() {
    console.debug('GET_PROPOSALS_REQUEST');
  },
  GET_PROPOSALS_SUCCESS() {
    console.debug('GET_PROPOSALS_SUCCESS');
  },
  GET_PROPOSALS_FAILURE(_state, payload) {
    console.debug('GET_PROPOSALS_FAILURE', payload);
  },
  GET_PROPOSAL_REQUEST() {
    console.debug('GET_PROPOSAL_REQUEST');
  },
  GET_PROPOSAL_SUCCESS() {
    console.debug('GET_PROPOSAL_SUCCESS');
  },
  GET_PROPOSAL_FAILURE(_state, payload) {
    console.debug('GET_PROPOSAL_FAILURE', payload);
  },
  GET_VOTERS_BALANCES_REQUEST() {
    console.debug('GET_VOTERS_BALANCES_REQUEST');
  },
  GET_VOTERS_BALANCES_SUCCESS() {
    console.debug('GET_VOTERS_BALANCES_SUCCESS');
  },
  GET_VOTERS_BALANCES_FAILURE(_state, payload) {
    console.debug('GET_VOTERS_BALANCES_FAILURE', payload);
  }
};

const actions = {
  post: async ({ commit, dispatch, rootState }, payload) => {
    commit('POST_REQUEST');
    try {
      const message = {
        token: payload.token,
        type: 'proposal',
        authors: [rootState.web3.account],
        timestamp: new Date().getTime(),
        payload: {
          name: payload.name,
          body: payload.body,
          choices: payload.choices,
          startBlock: payload.startBlock,
          endBlock: payload.endBlock
        }
      };
      const sig = await dispatch('signMessage', JSON.stringify(message));
      // @ts-ignore
      message.sig = [sig];
      const result = await client.request('proposal', { message });
      commit('POST_SUCCESS');
      dispatch('notify', ['green', 'Your proposal is in!']);
      return result;
    } catch (e) {
      commit('POST_FAILURE', e);
    }
  },
  vote: async ({ commit, dispatch, rootState }, payload) => {
    commit('VOTE_REQUEST');
    try {
      const message = {
        token: payload.token,
        type: 'vote',
        authors: [rootState.web3.account],
        timestamp: new Date().getTime(),
        payload: {
          proposal: payload.proposal,
          choice: payload.choice
        }
      };
      const sig = await dispatch('signMessage', JSON.stringify(message));
      // @ts-ignore
      message.sig = [sig];
      const result = await client.request('vote', { message });
      commit('VOTE_SUCCESS');
      dispatch('notify', ['green', 'Your vote is in!']);
      return result;
    } catch (e) {
      commit('VOTE_FAILURE', e);
    }
  },
  getProposals: async ({ commit }, payload) => {
    commit('GET_PROPOSALS_REQUEST');
    try {
      const result = await client.request(`${payload}/proposals`);
      commit('GET_PROPOSALS_SUCCESS');
      return result;
    } catch (e) {
      commit('GET_PROPOSALS_FAILURE', e);
    }
  },
  getProposal: async ({ commit, dispatch }, payload) => {
    commit('GET_PROPOSAL_REQUEST');
    try {
      const result = await client.request(
        `${payload.token}/proposal/${payload.id}`
      );
      const votes = await dispatch('getVotersBalances', {
        token: payload.token,
        addresses: Object.values(result.votes).map(
          (vote: any) => vote.authors[0]
        )
      });
      result.votes = Object.fromEntries(
        Object.entries(result.votes)
          .map((vote: any) => {
            vote[1].balance = votes[vote[1].authors[0]];
            return vote;
          })
          .sort((a, b) => b[1].balance - a[1].balance)
          .filter(vote => vote[1].balance > 0)
      );
      result.results = {
        totalVotes: result.proposal.payload.choices.map(
          (choice, i) =>
            Object.values(result.votes).filter(
              (vote: any) => vote.payload.choice === i + 1
            ).length
        ),
        totalBalances: result.proposal.payload.choices.map((choice, i) =>
          Object.values(result.votes)
            .filter((vote: any) => vote.payload.choice === i + 1)
            .reduce((a, b: any) => a + b.balance, 0)
        ),
        totalVotesBalances: Object.values(result.votes).reduce(
          (a, b: any) => a + b.balance,
          0
        )
      };
      commit('GET_PROPOSAL_SUCCESS');
      return result;
    } catch (e) {
      commit('GET_PROPOSAL_FAILURE', e);
    }
  },
  getVotersBalances: async ({ commit }, { token, addresses }) => {
    commit('GET_VOTERS_BALANCES_REQUEST');
    const multi = new ethers.Contract(
      config.addresses.multicall,
      abi['Multicall'],
      ethers.getDefaultProvider()
    );
    const calls = [];
    const testToken = new Interface(abi.TestToken);
    addresses.forEach(address => {
      // @ts-ignore
      calls.push([token, testToken.functions.balanceOf.encode([address])]);
    });
    const balances: any = {};
    try {
      const [, response] = await multi.aggregate(calls);
      response.forEach((value, i) => {
        const tokenBalance = testToken.functions.balanceOf.decode(value);
        balances[addresses[i]] = parseFloat(
          formatEther(tokenBalance.toString())
        );
      });
      commit('GET_VOTERS_BALANCES_SUCCESS');
      return balances;
    } catch (e) {
      commit('GET_VOTERS_BALANCES_FAILURE', e);
      return Promise.reject();
    }
  }
};

export default {
  mutations,
  actions
};
