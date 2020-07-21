<template>
  <Container :slim="true">
    <div class="px-4 px-md-0 mb-3">
      <router-link :to="{ name: 'home' }" class="text-gray">
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
              v-model="form.name"
              maxlength="128"
              class="h1 mb-2 input"
              placeholder="Question"
            />
            <textarea-autosize
              v-model="form.body"
              maxlength="10240"
              class="input"
              placeholder="What is your proposal?"
            />
          </div>
        </div>
        <Block title="Choices">
          <div v-if="form.choices.length > 0" class="overflow-hidden mb-2">
            <div
              v-for="(choice, i) in form.choices"
              :key="i"
              class="d-flex mb-2"
            >
              <UiButton class="d-flex width-full">
                <span class="mr-4">{{ i + 1 }}</span>
                <input
                  v-model="form.choices[i]"
                  class="input height-full flex-auto text-center"
                />
                <span @click="removeChoice(i)" class="ml-4">
                  <Icon name="close" size="12" />
                </span>
              </UiButton>
            </div>
          </div>
          <UiButton @click="addChoice" class="d-block width-full">
            Add choice
          </UiButton>
        </Block>
      </div>
      <div class="col-12 col-lg-4 float-left">
        <Block title="Actions">
          <div class="mb-2">
            <UiButton class="width-full mb-2">
              <input
                v-model="form.start"
                @click="[(modalOpen = true), (selectedDate = 'start')]"
                type="number"
                class="input width-full"
                placeholder="Start at"
              />
            </UiButton>
            <UiButton class="width-full mb-2">
              <input
                v-model="form.end"
                @click="[(modalOpen = true), (selectedDate = 'end')]"
                type="number"
                class="input width-full"
                placeholder="End at"
              />
            </UiButton>
            <UiButton class="width-full mb-2">
              <input
                v-model="form.snapshot"
                type="number"
                class="input width-full"
                placeholder="Snapshot block number"
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
    <ModalSelectDate
      :open="modalOpen"
      @close="modalOpen = false"
      @input="setDate"
    />
  </Container>
</template>

<script>
import { mapActions } from 'vuex';
import tokens from '@/namespaces.json';

export default {
  data() {
    return {
      key: this.$route.params.key,
      loading: false,
      form: {
        name: '',
        body: '',
        choices: ['', ''],
        start: '',
        end: '',
        snapshot: ''
      },
      modalOpen: false,
      selectedDate: ''
    };
  },
  computed: {
    token() {
      return tokens[this.key]
        ? tokens[this.key]
        : { token: this.key, verified: [] };
    },
    isValid() {
      const ts = (Date.now() / 1e3).toFixed();
      const minBlock = (3600 * 24) / 15;
      return (
        !this.loading &&
        this.web3.account &&
        this.form.name &&
        this.form.body &&
        this.form.start &&
        this.form.start >= ts &&
        this.form.end &&
        this.form.end >= ts + minBlock &&
        this.form.end > this.form.start &&
        this.form.choices.length >= 2 &&
        this.form.choices.reduce((a, b) => (!a ? false : b), true)
      );
    }
  },
  methods: {
    ...mapActions(['send']),
    addChoice() {
      this.form.choices.push('');
    },
    removeChoice(i) {
      delete this.form.choices[i];
      this.form.choices = this.form.choices.filter(String);
    },
    setDate(date) {
      if (this.selectedDate) {
        date = (new Date(date).getTime() / 1e3).toFixed();
        this.form[this.selectedDate] = date;
      }
    },
    async handleSubmit() {
      this.loading = true;
      try {
        const { ipfsHash } = await this.send({
          token: this.token.token,
          type: 'proposal',
          payload: this.form
        });
        this.$router.push({
          name: 'proposal',
          params: {
            key: this.key,
            id: ipfsHash
          }
        });
      } catch (e) {
        console.error(e);
        this.loading = false;
      }
    }
  }
};
</script>
