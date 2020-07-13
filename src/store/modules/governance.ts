import client from '@/helpers/client';

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
      const result = await client.request('proposal', {
        message,
        sig
      });
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
      const result = await client.request('vote', { message, sig });
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
  getProposal: async ({ commit }, payload) => {
    commit('GET_PROPOSAL_REQUEST');
    try {
      const result = await client.request(
        `${payload.token}/proposal/${payload.id}`
      );
      commit('GET_PROPOSAL_SUCCESS');
      return result;
    } catch (e) {
      commit('GET_PROPOSAL_FAILURE', e);
    }
  }
};

export default {
  mutations,
  actions
};
