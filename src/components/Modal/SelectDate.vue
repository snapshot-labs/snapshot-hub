<template>
  <UiModal :open="open" @close="$emit('close')">
    <h3 class="m-4 text-center">Select a date</h3>
    <div class="modal-body">
      <UiCalendar
        @input="[$emit('input', input), $emit('close')]"
        v-model="input"
        class="mx-auto mb-7"
      />
    </div>
  </UiModal>
</template>

<script>
export default {
  props: ['open'],
  data() {
    return {
      input: ''
    };
  }
};
</script>
