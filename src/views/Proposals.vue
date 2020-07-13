<template>
  <Container>
    <div class="mb-3 d-flex">
      <div class="flex-auto">
        <div>
          <a :href="_etherscanLink(token.token)" target="_blank">
            {{ token.name || _shorten(key) }}
            <Icon name="external-link" />
          </a>
        </div>
        <div class="d-flex flex-items-center flex-auto">
          <h3 v-text="'Proposals'" class="mr-2" />
          <UiCounter :counter="totalProposals" />
        </div>
      </div>
      <router-link :to="{ name: 'create' }">
        <UiButton>New proposal</UiButton>
      </router-link>
    </div>
    <div class="rounded-2 border overflow-hidden">
      <div class="px-4 py-3 bg-gray-dark">
        <span class="mr-3">All</span>
        <span class="mr-3">Actives</span>
        <span class="mr-3">Approved</span>
      </div>
      <RowLoading v-if="loading" />
      <div v-if="loaded">
        <RowProposal
          v-for="(proposal, i) in proposals"
          :key="i"
          :proposal="proposal"
          :token="key"
          :i="i"
        />
      </div>
      <div
        v-if="loaded && Object.keys(proposals).length === 0"
        class="px-4 py-3 border-top d-block"
      >
        There isn't any proposal here yet!
      </div>
    </div>
  </Container>
</template>

<script>
import { mapActions } from 'vuex';
import tokens from '@/helpers/tokens.json';

export default {
  data() {
    return {
      key: this.$route.params.key,
      loading: false,
      loaded: false,
      proposals: {}
    };
  },
  computed: {
    token() {
      return tokens[this.key] ? tokens[this.key] : { token: this.key };
    },
    totalProposals() {
      return Object.entries(this.proposals).length;
    }
  },
  methods: {
    ...mapActions(['getProposals'])
  },
  async created() {
    this.loading = true;
    this.proposals = await this.getProposals(this.token.token);
    this.loading = false;
    this.loaded = true;
  }
};
</script>
