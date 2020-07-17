<template>
  <Container :slim="true">
    <template v-if="loaded">
      <div class="px-4 px-md-0 mb-3">
        <router-link :to="{ name: 'proposals' }">
          <Icon name="back" size="22" class="v-align-middle" />
          {{ token.name || _shorten(token.token) }}
        </router-link>
      </div>
      <div>
        <div class="col-12 col-lg-8 float-left pr-0 pr-lg-5">
          <div class="px-4 px-md-0">
            <h1 class="mb-2">
              {{ proposal.msg.payload.name }}
              <span v-text="`#${id.slice(0, 7)}`" class="text-gray" />
            </h1>
            <State :proposal="proposal" class="mb-4" />
            <p
              v-html="proposal.msg.payload.body.replace(/\n/g, '<br />')"
              class="mb-6"
            />
          </div>
          <Block
            v-if="
              web3.blockNumber >= proposal.msg.payload.startBlock &&
                web3.blockNumber < proposal.msg.payload.endBlock
            "
            class="mb-4"
            title="Cast your vote"
          >
            <div class="mb-3">
              <UiButton
                v-for="(choice, i) in proposal.msg.payload.choices"
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
              class="px-4 py-3 border-top d-flex"
            >
              <div class="column">
                <User :address="address" :verified="token.verified" />
              </div>
              <div class="flex-auto text-center">
                <span
                  v-text="
                    proposal.msg.payload.choices[vote.msg.payload.choice - 1]
                  "
                  class="text-white ml-2 column"
                />
                <a
                  @click="openReceiptModal(vote)"
                  target="_blank"
                  class="ml-3 column"
                >
                  <Icon name="signature" />
                </a>
              </div>
              <div
                v-text="
                  `${$n(vote.balance)} ${token.symbol || _shorten(token.token)}`
                "
                class="text-white text-right column"
              />
            </div>
          </Block>
        </div>
        <div class="col-12 col-lg-4 float-left">
          <Block title="Informations">
            <div class="mb-1">
              <b>Author</b>
              <User
                :address="proposal.address"
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
                #{{ proposal.ipfsHash.slice(0, 7) }}
                <Icon name="external-link" class="ml-1" />
              </a>
            </div>
            <div class="mb-1">
              <b>Start date</b>
              <span
                :title="`Block ${$n(proposal.msg.payload.startBlock)}`"
                v-text="
                  $d(_blockNumberToTs(proposal.msg.payload.startBlock), 'long')
                "
                class="float-right text-white"
              />
            </div>
            <div class="mb-1">
              <b>End date</b>
              <span
                :title="`Block ${$n(proposal.msg.payload.endBlock)}`"
                v-text="
                  $d(_blockNumberToTs(proposal.msg.payload.endBlock), 'long')
                "
                class="float-right text-white"
              />
            </div>
          </Block>
          <Block
            :title="
              web3.blockNumber >= proposal.msg.payload.endBlock
                ? 'Results'
                : 'Current results'
            "
          >
            <div v-for="(choice, i) in proposal.msg.payload.choices" :key="i">
              <div class="text-white mb-1">
                <span v-text="choice" class="mr-1" />
                <span v-if="results.totalBalances[i]" class="mr-1">
                  {{ $n(results.totalBalances[i].toFixed(0)) }}
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
                      !results.totalVotesBalances
                        ? 0
                        : ((100 / results.totalVotesBalances) *
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
      <ModalReceipt
        :open="modalReceiptOpen"
        @close="modalReceiptOpen = false"
        :authorIpfsHash="authorIpfsHash"
        :relayerIpfsHash="relayerIpfsHash"
      />
    </template>
    <div v-else class="text-center">
      <UiLoading class="big" />
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
      id: this.$route.params.id,
      loading: false,
      loaded: false,
      voteLoading: false,
      proposal: {},
      votes: {},
      results: [],
      modalOpen: false,
      modalReceiptOpen: false,
      authorIpfsHash: '',
      relayerIpfsHash: '',
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
    },
    openReceiptModal(vote) {
      this.authorIpfsHash = vote.authorIpfsHash;
      this.relayerIpfsHash = vote.relayerIpfsHash;
      this.modalReceiptOpen = true;
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
