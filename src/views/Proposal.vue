<template>
  <Container>
    <template v-if="loaded">
      <div class="mb-3">
        <router-link :to="{ name: 'home' }">
          <Icon name="back" size="22" class="v-align-middle" />
          {{ token.name || _shorten(token.token) }}
        </router-link>
      </div>
      <div class="d-flex">
        <div class="col-8 float-left pr-5">
          <h1 v-text="proposal.payload.name" class="mb-2" />
          <div class="mb-4">
            <span class="State bg-green" title="Status: Open">
              Active
            </span>
          </div>
          <div v-html="formatMarkdown(proposal.payload.body)" class="mb-5" />
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
        <div class="col-4 float-left">
          <Block title="Informations">
            <p>
              Author:
              <a
                :href="_etherscanLink(proposal.authors[0])"
                target="_blank"
                class="text-white"
              >
                {{ _shorten(proposal.authors[0]) }}
                <Icon name="external-link" />
              </a>
            </p>
            <p>
              IPFS Hash:
              <a
                :href="`https://gateway.pinata.cloud/ipfs/${proposal.ipfsHash}`"
                target="_blank"
                class="text-white"
              >
                {{ _shorten(proposal.ipfsHash) }}
                <Icon name="external-link" />
              </a>
            </p>
          </Block>
          <Block title="Results">
            <div v-for="(choice, i) in proposal.payload.choices" :key="i">
              <div class="text-white mb-1">{{ choice }} 50%</div>
              <UiProgress
                :value="Math.random(0, 100) * 100"
                :max="100"
                class="mb-3"
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
      this.voteLoading = false;
    },
    formatMarkdown(str) {
      return marked(str);
    }
  },
  async created() {
    this.loading = true;
    this.proposal = await this.getProposal({
      token: this.token.token,
      id: this.id
    });
    this.loading = false;
    this.loaded = true;
  }
};
</script>
