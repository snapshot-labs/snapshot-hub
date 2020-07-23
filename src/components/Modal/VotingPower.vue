<template>
  <UiModal :open="open" @close="$emit('close')">
    <h3 class="m-4 mb-0 text-center">Your voting power</h3>
    <h2 class="m-4 mb-0 p-4 border rounded-2 text-center">
      {{ _numeral(gov.votingPower) }} {{ gov.namespace.symbol }}
    </h2>
    <div class="m-4 p-4 border rounded-2 text-white">
      <div class="d-flex">
        <span v-text="'Snapshot'" class="flex-auto text-gray mr-1" />
        <a :href="_etherscanLink(gov.snapshot, 'block')" target="_blank">
          {{ $n(gov.snapshot) }}
          <Icon name="external-link" class="ml-1" />
        </a>
      </div>
      <div class="d-flex">
        <span v-text="'Total voting power'" class="flex-auto text-gray mr-1" />
        {{ _numeral(gov.votingPower) }} {{ gov.namespace.symbol }}
      </div>
      <div class="d-flex">
        <span v-text="'Wallet balance'" class="flex-auto text-gray mr-1" />
        <a :href="_etherscanLink(web3.account)" target="_blank">
          {{ _numeral(gov.walletBalance) }} {{ gov.namespace.symbol }}
          <Icon name="external-link" class="ml-1" />
        </a>
      </div>
      <div v-for="(pool, i) in gov.votingPowerByPools" :key="i" class="d-flex">
        <span
          v-text="`Balancer pool ${_shorten(i)}`"
          class="flex-auto text-gray mr-1"
        />
        <a
          :href="`https://pools.balancer.exchange/#/pool/${i}`"
          target="_blank"
        >
          {{ $n(pool) }} {{ gov.namespace.symbol }}
          <Icon name="external-link" class="ml-1" />
        </a>
      </div>
    </div>
  </UiModal>
</template>

<script>
export default {
  props: ['open']
};
</script>
