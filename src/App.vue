<template>
  <div id="app" class="overflow-hidden">
    <VueLoadingIndicator v-if="ui.loading || !ui.init" class="overlay big" />
    <div v-else>
      <Topnav />
      <div class="d-flex flex-row pb-6">
        <router-view :key="$route.path" class="flex-auto" />
      </div>
    </div>
    <Notifications />
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  methods: {
    ...mapActions(['init'])
  },
  mounted() {
    this.init();
  }
};
</script>
