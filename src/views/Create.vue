<template>
  <Container>
    <div class="mb-3">
      <router-link :to="{ name: 'home' }">
        <Icon name="back" size="22" class="v-align-middle" />
        {{ token.name || _shorten(token.token) }}
      </router-link>
    </div>
    <div>
      <div class="col-8 float-left pr-5">
        <div class="d-flex flex-column mb-4">
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
        <Block title="Choices">
          <div class="overflow-hidden mb-2">
            <div v-for="(choice, i) in choices" :key="i" class="d-flex mb-2">
              <UiButton class="mr-2">{{ i + 1 }}</UiButton>
              <UiButton class="flex-auto">
                <input
                  v-model="choices[i]"
                  class="input height-full width-full"
                />
              </UiButton>
              <UiButton @click="removeChoice(i)" class="ml-2">x</UiButton>
            </div>
          </div>
          <UiButton @click="addChoice" class="d-block width-full">
            + Add choice
          </UiButton>
        </Block>
      </div>
      <div class="col-4 float-left">
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
            :disabled="loading"
            :loading="loading"
            class="d-block width-full"
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
      return tokens[this.key] ? tokens[this.key] : { token: this.key };
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
