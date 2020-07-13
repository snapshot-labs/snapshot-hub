<template>
  <div class="border rounded-2 mb-4 overflow-hidden">
    <h4
      v-if="title"
      v-text="title"
      class="px-4 py-3 border-bottom d-block bg-gray-dark"
    />
    <div class="p-4">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  props: ['title']
};
</script>
