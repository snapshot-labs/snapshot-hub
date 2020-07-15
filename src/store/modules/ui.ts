import Vue from 'vue';
import connectors from '@/helpers/connectors';
import { lsGet } from '@/helpers/utils';

const state = {
  init: false,
  loading: false
};

const mutations = {
  SET(_state, payload) {
    Object.keys(payload).forEach(key => {
      Vue.set(_state, key, payload[key]);
    });
  }
};

const actions = {
  init: async ({ commit, dispatch }) => {
    commit('SET', { loading: true });
    await dispatch('getBlockNumber');
    const connector = lsGet('connector');
    if (connector) {
      const isLoggedIn = await connectors[connector].isLoggedIn();
      if (isLoggedIn) await dispatch('login', connector);
    }
    commit('SET', { loading: false, init: true });
  },
  loading: ({ commit }, payload) => {
    commit('SET', { loading: payload });
  }
};

export default {
  state,
  mutations,
  actions
};
