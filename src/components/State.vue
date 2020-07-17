<template>
  <span
    v-if="web3.blockNumber"
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
      const { blockNumber } = this.web3;
      const { startBlock, endBlock } = this.proposal.msg.payload;
      if (blockNumber > endBlock) return { name: 'Closed', class: 'bg-purple' };
      if (blockNumber > startBlock)
        return { name: 'Active', class: 'bg-green' };
      return { name: 'Pending' };
    }
  }
};
</script>
