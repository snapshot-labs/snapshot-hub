<template>
  <UiModal :open="open" @close="$emit('close')" class="d-flex">
    <form @submit.prevent="handleSubmit" class="d-flex flex-column flex-auto">
      <h3 class="m-4 mb-0 text-center">Confirm vote</h3>
      <div class="m-4 flex-auto text-center">
        <div class="mb-3">
          <div class="mb-3">
            <Token
              v-if="votingPower.balance"
              :address="token.token"
              size="38"
              class="mr-n3 ml-n3"
            />
            <span
              v-if="votingPower.bptBalance"
              class="line-height-0 position-relative d-inline-block"
            >
              <Token :address="token.token" size="38" class="border" />
              <Token
                :address="namespaces.balancer.token"
                size="18"
                class="position-absolute right-0 bottom-0 border"
              />
            </span>
          </div>
          <h4>You voting power on block {{ $n(snapshot) }} is</h4>
          <h4>
            <template v-if="votingPower.balance !== votingPower.total">
              {{ $n(votingPower.balance) }} {{ tokenName }} +
              {{ $n(votingPower.bptBalance) }} BPT {{ tokenName }} =
            </template>
            {{ $n(votingPower.total) }} {{ tokenName }}
          </h4>
        </div>
        <h4>
          Are you sure you want to vote for this option? This action
          <b>cannot</b> be undone.
        </h4>
        <h4 class="p-3 my-3 border rounded-2">
          Option {{ selectedChoice }}:
          {{ proposal.msg.payload.choices[selectedChoice - 1] }}
        </h4>
      </div>
      <div class="p-4 overflow-hidden text-center border-top">
        <div class="col-6 float-left pr-2">
          <UiButton @click="$emit('close')" type="button" class="width-full">
            Cancel
          </UiButton>
        </div>
        <div class="col-6 float-left pl-2">
          <UiButton
            :disabled="loading"
            :loading="loading"
            type="submit"
            class="width-full button--submit"
          >
            Vote
          </UiButton>
        </div>
      </div>
    </form>
  </UiModal>
</template>

<script>
import { mapActions } from 'vuex';
import namespaces from '@/namespaces.json';

export default {
  props: [
    'open',
    'token',
    'proposal',
    'id',
    'selectedChoice',
    'votingPower',
    'snapshot'
  ],
  data() {
    return {
      loading: false,
      namespaces
    };
  },
  computed: {
    tokenName() {
      return this.token.symbol || this._shorten(this.token.token);
    }
  },
  methods: {
    ...mapActions(['send']),
    async handleSubmit() {
      this.loading = true;
      await this.send({
        token: this.token.token,
        type: 'vote',
        payload: {
          proposal: this.id,
          choice: this.selectedChoice
        }
      });
      this.$emit('reload');
      this.$emit('close');
      this.loading = false;
    }
  }
};
</script>
