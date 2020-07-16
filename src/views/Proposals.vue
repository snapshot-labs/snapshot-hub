<template>
  <div>
    <Container>
      <div class="mb-3 d-flex">
        <div class="flex-auto">
          <div>
            <a :href="_etherscanLink(token.token)" target="_blank">
              {{ token.name || _shorten(key) }}
              <Icon name="external-link" class="ml-1" />
            </a>
          </div>
          <div class="d-flex flex-items-center flex-auto">
            <h2 class="mr-2">
              Proposals
              <UiCounter :counter="totalProposals" class="ml-1" />
            </h2>
          </div>
        </div>
        <router-link v-if="web3.account" :to="{ name: 'create' }">
          <UiButton>New proposal</UiButton>
        </router-link>
      </div>
    </Container>
    <Container :slim="true">
      <Block :slim="true">
        <div class="px-4 py-3 bg-gray-dark">
          <a
            v-for="state in ['All', 'Active', 'Pending', 'Closed']"
            :key="state"
            v-text="state"
            @click="selectedState = state"
            :class="selectedState === state && 'text-white'"
            class="mr-3"
          />
        </div>
        <RowLoading v-if="loading" />
        <div v-if="loaded">
          <RowProposal
            v-for="(proposal, i) in proposalsWithFilter"
            :key="i"
            :proposal="proposal"
            :token="key"
            :verified="token.verified"
            :i="i"
          />
        </div>
        <div
          v-if="loaded && Object.keys(proposalsWithFilter).length === 0"
          class="p-4 border-top d-block"
        >
          There isn't any proposal here yet!
        </div>
      </Block>
    </Container>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import tokens from '@/helpers/tokens.json';

export default {
  data() {
    return {
      loading: false,
      loaded: false,
      proposals: {},
      selectedState: 'All'
    };
  },
  computed: {
    key() {
      return this.$route.params.key;
    },
    token() {
      return tokens[this.key]
        ? tokens[this.key]
        : { token: this.key, verified: [] };
    },
    totalProposals() {
      return Object.keys(this.proposals).length;
    },
    proposalsWithFilter() {
      if (this.totalProposals === 0) return {};
      return Object.fromEntries(
        Object.entries(this.proposals)
          .filter(proposal => {
            if (!this.token.verified.includes(proposal[1].authors[0].address))
              return false;
            if (this.selectedState === 'All')
              return (
                proposal[1].payload.endBlock > this.web3.currentBlockNumber
              );
            if (
              this.selectedState === 'Active' &&
              proposal[1].payload.startBlock <= this.web3.currentBlockNumber &&
              proposal[1].payload.endBlock > this.web3.currentBlockNumber
            ) {
              return true;
            }
            if (
              this.selectedState === 'Closed' &&
              proposal[1].payload.endBlock <= this.web3.currentBlockNumber
            ) {
              return true;
            }
            if (
              this.selectedState === 'Pending' &&
              proposal[1].payload.startBlock > this.web3.currentBlockNumber
            ) {
              return true;
            }
          })
          .sort((a, b) => a[1].payload.startBlock - b[1].payload.startBlock, 0)
      );
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
