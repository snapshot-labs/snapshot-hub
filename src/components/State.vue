<template>
  <span
    v-if="web3.currentBlockNumber"
    class="State"
    :class="state.class"
    v-text="state.name"
  />
</template>

<script>
export default {
  props: {
    proposal: Object
  },
  computed: {
    state() {
      const { currentBlockNumber } = this.web3;
      const { startBlock, endBlock } = this.proposal.payload;
      if (currentBlockNumber > endBlock)
        return { name: 'Closed', class: 'bg-purple' };
      if (currentBlockNumber > startBlock)
        return { name: 'Active', class: 'bg-green' };
      return { name: 'Pending' };
    }
  }
};
</script>
