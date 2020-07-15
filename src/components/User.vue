<template>
  <a :href="_etherscanLink(address)" target="_blank" class="text-white">
    <Avatar :address="address" size="16" class="mr-1" />
    {{ name }}
    <Icon v-if="isVerified" name="check" class="mr-1" title="Verified" />
    <Icon name="external-link" class="ml-1" />
  </a>
</template>

<script>
export default {
  props: {
    address: String,
    verified: Array
  },
  computed: {
    name() {
      return this.web3.account &&
        this.address.toLowerCase() === this.web3.account.toLowerCase()
        ? 'You'
        : this._shorten(this.address);
    },
    isVerified() {
      return (
        Array.isArray(this.verified) &&
        this.verified.length > 0 &&
        this.verified.includes(this.address)
      );
    }
  }
};
</script>
