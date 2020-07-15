<template>
  <Container>
    <template v-if="loaded">
      <div class="mb-3">
        <router-link :to="{ name: 'home' }">
          <Icon name="back" size="22" class="v-align-middle" />
          {{ token.name || _shorten(token.token) }}
        </router-link>
      </div>
      <div>
        <div class="col-12 col-lg-8 float-left pr-0 pr-lg-5">
          <h1 class="mb-2">
            {{ proposal.payload.name }}
            <span v-text="`#${id}`" class="text-gray" />
          </h1>
          <State :proposal="proposal" class="mb-4" />
          <p
            v-html="proposal.payload.body.replace(/\n/g, '<br />')"
            class="mb-6"
          />
          <Block
            v-if="
              web3.currentBlockNumber >= proposal.payload.startBlock &&
                web3.currentBlockNumber < proposal.payload.endBlock
            "
            class="mb-4"
            title="Cast your vote"
          >
            <div class="mb-3">
              <UiButton
                v-for="(choice, i) in proposal.payload.choices"
                :key="i"
                v-text="choice"
                @click="selectedChoice = i + 1"
                class="d-block width-full mb-2"
                :style="selectedChoice === i + 1 && 'border-color: white;'"
              />
            </div>
            <UiButton
              :disabled="voteLoading || !selectedChoice || !web3.account"
              :loading="voteLoading"
              @click="modalOpen = true"
              class="d-block width-full button--submit"
            >
              Vote
            </UiButton>
          </Block>
          <Block
            v-if="Object.keys(votes).length > 0"
            title="Votes"
            :counter="Object.keys(votes).length"
            :slim="true"
          >
            <div
              v-for="(vote, address, i) in votes"
              :key="i"
              :style="i === 0 && 'border: 0 !important;'"
              class="px-4 py-3 border-top"
            >
              <span
                v-text="
                  `${$n(vote.balance)} ${token.symbol || _shorten(token.token)}`
                "
                class="float-right text-white"
              />
              <User :address="address" :verified="token.verified" />
              <span
                v-text="proposal.payload.choices[vote.payload.choice - 1]"
                class="text-white ml-2"
              />
              <a :href="_ipfsUrl(vote.ipfsHash)" target="_blank" class="ml-2">
                IPFS
                <Icon name="external-link" />
              </a>
            </div>
          </Block>
        </div>
        <div class="col-12 col-lg-4 float-left">
          <Block title="Informations">
            <div class="mb-1">
              <b>Author</b>
              <User
                :address="proposal.authors[0]"
                :verified="token.verified"
                class="float-right"
              />
            </div>
            <div class="mb-1">
              <b>IPFS</b>
              <a
                :href="_ipfsUrl(proposal.ipfsHash)"
                target="_blank"
                class="float-right text-white"
              >
                {{ _shorten(proposal.ipfsHash) }}
                <Icon name="external-link" class="ml-1" />
              </a>
            </div>
            <div class="mb-1">
              <b>Starting block</b>
              <span class="float-right text-white">
                {{ $n(proposal.payload.startBlock) }}
              </span>
            </div>
            <div class="mb-1">
              <b>Ending block</b>
              <span class="float-right text-white">
                {{ $n(proposal.payload.endBlock) }}
              </span>
            </div>
          </Block>
          <Block title="Current results">
            <div v-for="(choice, i) in proposal.payload.choices" :key="i">
              <div class="text-white mb-1">
                <span v-text="choice" class="mr-1" />
                <span v-if="results.totalBalances[i]" class="mr-1">
                  {{ $n(results.totalBalances[i]) }}
                  {{ token.symbol || _shorten(token.token) }}
                </span>
                <span v-if="results.totalVotes[i]" class="text-gray mr-1">
                  {{ $n(results.totalVotes[i]) }} vote{{
                    results.totalVotes[i] > 1 ? 's' : ''
                  }}
                </span>
                <span
                  class="float-right"
                  v-text="
                    $n(
                      ((100 / results.totalVotesBalances) *
                        results.totalBalances[i]) /
                        1e2,
                      'percent'
                    )
                  "
                />
              </div>
              <UiProgress
                :value="results.totalBalances[i]"
                :max="results.totalVotesBalances"
                class="mb-3"
              />
            </div>
          </Block>
        </div>
      </div>
      <ModalConfirm
        :open="modalOpen"
        @close="modalOpen = false"
        @reload="loadProposal"
        :token="token.token"
        :proposal="proposal"
        :id="id"
        :selectedChoice="selectedChoice"
      />
    </template>
    <VueLoadingIndicator v-else class="big" />
  </Container>
</template>

<script>
import { mapActions } from 'vuex';
import tokens from '@/helpers/tokens.json';

export default {
  data() {
    return {
      key: this.$route.params.key,
      id: this.$route.params.id,
      loading: false,
      loaded: false,
      voteLoading: false,
      proposal: {},
      votes: {},
      results: [],
      modalOpen: false,
      selectedChoice: 0
    };
  },
  computed: {
    token() {
      return tokens[this.key]
        ? tokens[this.key]
        : { token: this.key, verified: [] };
    }
  },
  methods: {
    ...mapActions(['getProposal']),
    async loadProposal() {
      const proposalObj = await this.getProposal({
        token: this.token.token,
        id: this.id
      });
      this.proposal = proposalObj.proposal;
      this.votes = proposalObj.votes;
      this.results = proposalObj.results;
    }
  },
  async created() {
    this.loading = true;
    await this.loadProposal();
    this.loading = false;
    this.loaded = true;
  }
};
</script>
