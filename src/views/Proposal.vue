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
          <div class="mb-6">
            <span class="State bg-green mr-2" v-text="'Active'" />
            By:
            <a
              :href="_etherscanLink(proposal.authors[0])"
              target="_blank"
              class="mr-2"
            >
              {{ _shorten(proposal.authors[0]) }}
              <Icon name="external-link" />
            </a>
            IPFS Hash:
            <a
              :href="`https://gateway.pinata.cloud/ipfs/${proposal.ipfsHash}`"
              target="_blank"
            >
              {{ _shorten(proposal.ipfsHash) }}
              <Icon name="external-link" />
            </a>
          </div>
          <div v-html="formatMarkdown(proposal.payload.body)" class="mb-6" />
          <Block title="Cast a vote">
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
              :disabled="voteLoading || !selectedChoice"
              :loading="voteLoading"
              @click="handleVote()"
              class="d-block width-full"
            >
              Vote
            </UiButton>
          </Block>
        </div>
        <div class="col-12 col-lg-4 float-left">
          <Block title="Results">
            <div v-for="(choice, i) in proposal.payload.choices" :key="i">
              <div class="text-white mb-1">
                {{ choice }}
                <span
                  v-text="
                    `${
                      votes.filter(vote => vote.payload.choice === i + 1).length
                    }`
                  "
                  class="text-gray ml-1"
                />
                <span class="float-right">50%</span>
              </div>
              <UiProgress
                :value="Math.random(0, 100) * 100"
                :max="100"
                class="mb-3"
              />
            </div>
          </Block>
          <Block v-if="votes.length > 0" title="Votes" :counter="votes.length">
            <div v-for="(vote, i) in votes" :key="i" class="mb-2 text-white">
              <a
                :href="_etherscanLink(vote.authors[0])"
                target="_blank"
                class="text-white"
              >
                {{ _shorten(vote.authors[0]) }}
                <Icon name="external-link" />
              </a>
              <span
                v-text="proposal.payload.choices[vote.payload.choice - 1]"
                class="float-right"
              />
            </div>
          </Block>
        </div>
      </div>
    </template>
    <VueLoadingIndicator v-else class="big" />
  </Container>
</template>

<script>
import { mapActions } from 'vuex';
import marked from 'marked';
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
      selectedChoice: 0
    };
  },
  computed: {
    token() {
      return tokens[this.key] ? tokens[this.key] : { token: this.key };
    }
  },
  methods: {
    ...mapActions(['getProposal', 'vote']),
    async handleVote() {
      this.voteLoading = true;
      await this.vote({
        token: this.token.token,
        proposal: this.id,
        choice: this.selectedChoice
      });
      const proposalObj = await this.getProposal({
        token: this.token.token,
        id: this.id
      });
      this.votes = proposalObj.votes;
      this.voteLoading = false;
    },
    formatMarkdown(str) {
      return marked(str);
    }
  },
  async created() {
    this.loading = true;
    const proposalObj = await this.getProposal({
      token: this.token.token,
      id: this.id
    });
    this.proposal = proposalObj.proposal;
    this.votes = proposalObj.votes;
    this.loading = false;
    this.loaded = true;
  }
};
</script>
