<template>
  <UiModal :open="open" @close="$emit('close')" class="d-flex">
    <form @submit.prevent="handleSubmit" class="d-flex flex-column flex-auto">
      <h3 class="m-4 mb-0 text-center">Confirm vote</h3>
      <div class="m-4 flex-auto text-center">
        <h4>Are you sure you want to vote for this option?</h4>
        <h4>This action <b>cannot</b> be undone.</h4>
        <h4 class="p-3 my-3 border rounded-2 text-white">
          Option {{ selectedChoice }}:
          {{ proposal.payload.choices[selectedChoice - 1] }}
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

export default {
  props: ['open', 'token', 'proposal', 'id', 'selectedChoice'],
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
        proposal: this.id,
        choice: this.selectedChoice
      });
      this.$emit('reload');
      this.$emit('close');
      this.loading = false;
    }
  }
};
</script>
