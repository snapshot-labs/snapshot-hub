<template>
  <span class="Progress Progress--small overflow-hidden">
    <span
      class="bg-blue anim-scale-in"
      :style="`width: ${parseInt((100 / max) * value)}%;`"
    />
  </span>
</template>

<script>
export default {
  props: {
    value: Number,
    max: Number
  }
};
</script>

<style scoped lang="scss">
@import '../../vars';

.Progress {
  background-color: $bg-gray-dark;
  height: 8px;
  border-radius: 4px;

  span {
    border-radius: 4px;
  }
}
</style>
