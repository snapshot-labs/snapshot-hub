<template>
  <UiModal :open="open" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <h3 class="m-4 mb-0 text-center">Confirm vote</h3>
      <h4 class="m-4 text-center">
        Are you sure you want to vote ‘{{ selectedChoice }}’? This action
        <b>can not</b> be undone.
      </h4>
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

export default {
  props: ['open', 'token', 'proposal', 'selectedChoice'],
  data() {
    return {
      loading: false
    };
  },
  methods: {
    ...mapActions(['vote']),
    async handleSubmit() {
      this.loading = true;
      await this.vote({
        token: this.token,
        proposal: this.proposal,
        choice: this.selectedChoice
      });
      this.$emit('close');
      this.loading = false;
    }
  }
};
</script>
