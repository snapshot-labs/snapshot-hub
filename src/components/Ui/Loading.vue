<template>
  <VueLoadingIndicator />
</template>

<style lang="scss">
@import '../../vars';

.vue-ui-loading-indicator {
  display: inline-block;
  vertical-align: middle;

  &.overlay {
    display: flex;
    background-color: transparent !important;
  }

  .animation {
    border-color: transparentize($white, 0.8);
    border-right-color: $white;
  }
}
</style>
