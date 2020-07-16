<template>
  <Container :slim="true">
    <div class="px-4 px-md-0 mb-3">
      <router-link :to="{ name: 'home' }">
        <Icon name="back" size="22" class="v-align-middle" />
        {{ token.name || _shorten(token.token) }}
      </router-link>
    </div>
    <div>
      <div class="col-12 col-lg-8 float-left pr-0 pr-lg-5">
        <div class="px-4 px-md-0">
          <div class="d-flex flex-column mb-6">
            <input
              v-autofocus
              v-model="name"
              class="h1 mb-2 input"
              placeholder="Question"
            />
            <textarea-autosize
              v-model="body"
              class="input"
              placeholder="What is your proposal?"
            />
          </div>
        </div>
        <Block title="Choices">
          <div v-if="choices.length > 0" class="overflow-hidden mb-2">
            <div v-for="(choice, i) in choices" :key="i" class="d-flex mb-2">
              <UiButton class="d-flex width-full">
                <span class="mr-4">{{ i + 1 }}</span>
                <input
                  v-model="choices[i]"
                  class="input height-full flex-auto"
                />
                <span @click="removeChoice(i)">
                  <Icon name="close" size="12" />
                </span>
              </UiButton>
            </div>
          </div>
          <UiButton @click="addChoice" class="d-block width-full">
            + Add choice
          </UiButton>
        </Block>
      </div>
      <div class="col-12 col-lg-4 float-left">
        <Block title="Actions">
          <div class="mb-2">
            <UiButton class="width-full mb-2">
              <input
                v-model="startBlock"
                type="number"
                class="input width-full"
                placeholder="Start at block number"
              />
            </UiButton>
            <UiButton class="width-full mb-2">
              <input
                v-model="endBlock"
                type="number"
                class="input width-full"
                placeholder="End at block number"
              />
            </UiButton>
          </div>
          <UiButton
            @click="handleSubmit"
            :disabled="!isValid"
            :loading="loading"
            class="d-block width-full button--submit"
          >
            Publish
          </UiButton>
        </Block>
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
      name: '',
      body: '',
      choices: ['', ''],
      startBlock: '',
      endBlock: ''
    };
  },
  computed: {
    token() {
      return tokens[this.key]
        ? tokens[this.key]
        : { token: this.key, verified: [] };
    },
    isValid() {
      const minBlock = (3600 * 24) / 15;
      return (
        !this.loading &&
        this.web3.account &&
        this.name &&
        this.body &&
        this.startBlock &&
        this.startBlock >= this.web3.currentBlockNumber &&
        this.endBlock &&
        this.endBlock >= this.web3.currentBlockNumber + minBlock &&
        this.endBlock > this.startBlock &&
        this.choices.length >= 2 &&
        this.choices.reduce((a, b) => (!a ? false : b), true)
      );
    }
  },
  methods: {
    ...mapActions(['post']),
    addChoice() {
      this.choices.push('');
    },

    removeChoice(i) {
      delete this.choices[i];
      this.choices = this.choices.filter(String);
    },
    async handleSubmit() {
      this.loading = true;
      await this.post({
        token: this.token.token,
        name: this.name,
        body: this.body,
        choices: this.choices,
        startBlock: this.startBlock,
        endBlock: this.endBlock
      });
      this.$router.push({ name: 'proposals' });
    }
  }
};
</script>
