<template>
  <a :href="_etherscanLink(address)" target="_blank" class="text-white">
    <Avatar :address="address" size="16" class="mr-1" />
    {{ name }}
    <Icon name="external-link" class="ml-1" />
  </a>
</template>

<script>
export default {
  props: {
    address: String
  },
  computed: {
    name() {
      return this.web3.account &&
        this.address.toLowerCase() === this.web3.account.toLowerCase()
        ? 'You'
        : this._shorten(this.address);
    }
  }
};
</script>
