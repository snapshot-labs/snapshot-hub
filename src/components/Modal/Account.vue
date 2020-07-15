<template>
  <UiModal :open="open" @close="$emit('close')">
    <div v-if="!web3.account || step === 'connect'">
      <h3 class="m-4 mb-0 text-center">Connect wallet</h3>
      <div class="m-4 border rounded-2">
        <a
          v-for="(connector, id, i) in connectors"
          :key="i"
          class="d-flex flex-items-center px-3 py-2"
          :class="i !== 0 && 'border-top'"
          @click="$emit('login', connector.id)"
        >
          <img
            :src="require(`@/assets/connectors/${connector.id}.svg`)"
            width="48"
            height="48"
            class="mr-3"
          />
          <h4 v-text="connector.name" />
        </a>
      </div>
    </div>
    <div v-else>
      <h3 class="m-4 mb-0 text-center">Account</h3>
      <div v-if="web3.account" class="m-4">
        <a
          :href="_etherscanLink(web3.account)"
          target="_blank"
          class="mb-2 d-block"
        >
          <UiButton class="button-outline width-full">
            <Avatar :address="web3.account" size="16" class="mr-2 ml-n1" />
            <span v-if="web3.name" v-text="web3.name" />
            <span v-else v-text="_shorten(web3.account)" />
            <Icon name="external-link" class="ml-1" />
          </UiButton>
        </a>
        <UiButton
          @click="step = 'connect'"
          class="button-outline width-full mb-2"
        >
          Connect wallet
        </UiButton>
        <UiButton
          @click="handleLogout"
          class="button-outline width-full text-red mb-2"
        >
          Log out
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script>
import { mapActions } from 'vuex';
import config from '@/helpers/config';

export default {
  props: ['open'],
  data() {
    return {
      step: null,
      connectors: config.connectors
    };
  },
  watch: {
    open() {
      this.step = null;
    }
  },
  methods: {
    ...mapActions(['logout']),
    async handleLogout() {
      await this.logout();
      this.$emit('close');
    }
  }
};
</script>
