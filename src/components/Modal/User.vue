<template>
  <UiModal :open="open" @close="$emit('close')">
    <h3
      v-text="_shorten(address)"
      class="m-4 text-center"
    />
  </UiModal>
</template>

<script>
export default {
  props: ['open', 'address']
};
</script>
