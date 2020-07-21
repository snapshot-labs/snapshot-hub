import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import { formatEther } from '@ethersproject/units';
import client from '@/helpers/client';
import ipfs from '@/helpers/ipfs';
import config from '@/helpers/config';
import abi from '@/helpers/abi';
import wsProvider from '@/helpers/ws';
import { formatProposal, formatProposals } from '@/helpers/utils';
import { version } from '@/../package.json';

const mutations = {
  SEND_REQUEST() {
    console.debug('SEND_REQUEST');
  },
  SEND_SUCCESS() {
    console.debug('SEND_SUCCESS');
  },
  SEND_FAILURE(_state, payload) {
    console.debug('SEND_FAILURE', payload);
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
  send: async ({ commit, dispatch, rootState }, { token, type, payload }) => {
    commit('SEND_REQUEST');
    try {
      const msg: any = {
        address: rootState.web3.account,
        msg: JSON.stringify({
          version,
          timestamp: (Date.now() / 1e3).toFixed(),
          token,
          type,
          payload
        })
      };
      msg.sig = await dispatch('signMessage', msg.msg);
      const result = await client.request('message', msg);
      commit('SEND_SUCCESS');
      dispatch('notify', ['green', `Your ${type} is in!`]);
      return result;
    } catch (e) {
      commit('SEND_FAILURE', e);
      dispatch('notify', ['red', 'Oops, something went wrong!']);
      return;
    }
  },
  getProposals: async ({ commit }, payload) => {
    commit('GET_PROPOSALS_REQUEST');
    try {
      const proposals: any = await client.request(`${payload}/proposals`);
      commit('GET_PROPOSALS_SUCCESS');
      return formatProposals(proposals);
    } catch (e) {
      commit('GET_PROPOSALS_FAILURE', e);
    }
  },
  getProposal: async ({ commit, dispatch, rootState }, payload) => {
    commit('GET_PROPOSAL_REQUEST');
    try {
      const result: any = {};
      const proposal = await ipfs.get(payload.id);
      result.proposal = formatProposal(proposal);
      result.proposal.ipfsHash = payload.id;
      result.votes = await client.request(
        `${payload.token}/proposal/${payload.id}`
      );
      const { snapshot } = result.proposal.msg.payload;
      const blockTag =
        snapshot > rootState.web3.blockNumber
          ? rootState.web3.blockNumber
          : parseInt(snapshot);
      const votes = await dispatch('getVotersBalances', {
        token: payload.token,
        addresses: Object.values(result.votes).map((vote: any) => vote.address),
        blockTag
      });
      result.votes = Object.fromEntries(
        Object.entries(result.votes)
          .map((vote: any) => {
            vote[1].balance = votes[vote[1].address];
            return vote;
          })
          .sort((a, b) => b[1].balance - a[1].balance)
          .filter(vote => vote[1].balance > 0)
      );
      result.results = {
        totalVotes: result.proposal.msg.payload.choices.map(
          (choice, i) =>
            Object.values(result.votes).filter(
              (vote: any) => vote.msg.payload.choice === i + 1
            ).length
        ),
        totalBalances: result.proposal.msg.payload.choices.map((choice, i) =>
          Object.values(result.votes)
            .filter((vote: any) => vote.msg.payload.choice === i + 1)
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
  getVotersBalances: async ({ commit }, { token, addresses, blockTag }) => {
    commit('GET_VOTERS_BALANCES_REQUEST');
    const multi = new Contract(config.multicall, abi['Multicall'], wsProvider);
    const calls = [];
    const testToken = new Interface(abi.TestToken);
    addresses.forEach(address => {
      // @ts-ignore
      calls.push([token, testToken.encodeFunctionData('balanceOf', [address])]);
    });
    const balances: any = {};
    try {
      const [, response] = await multi.aggregate(calls, { blockTag });
      response.forEach((value, i) => {
        balances[addresses[i]] = parseFloat(formatEther(value.toString()));
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
