<template>
  <router-link
    class="px-4 py-3 border-top d-block"
    :to="{ name: 'proposal', params: { key: token, id: i } }"
  >
    <div>
      <State :proposal="proposal" class="d-inline-block mr-2 mb-2" />
      <h3 v-text="proposal.msg.payload.name" class="d-inline-block mb-1" />
    </div>
    <div>
      <span v-text="`#${i.slice(0, 7)}`" class="text-gray" />
      By {{ _shorten(proposal.address) }}
      <Icon v-if="isVerified" name="check" title="Verified" />
      start
      <span
        :title="`Block ${$n(proposal.msg.payload.startBlock)}`"
        v-text="$d(_blockNumberToTs(proposal.msg.payload.startBlock))"
      />
      end
      <span
        :title="`Block ${$n(proposal.msg.payload.endBlock)}`"
        v-text="$d(_blockNumberToTs(proposal.msg.payload.endBlock))"
      />
    </div>
  </router-link>
</template>

<script>
export default {
  props: {
    token: String,
    proposal: Object,
    verified: Array,
    i: String
  },
  computed: {
    isVerified() {
      return (
        Array.isArray(this.verified) &&
        this.verified.length > 0 &&
        this.verified.includes(this.proposal.address)
      );
    }
  }
};
</script>
