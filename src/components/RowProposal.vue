<template>
  <router-link
    class="px-4 py-3 border-top d-block"
    :to="{ name: 'proposal', params: { key: token, id: i } }"
  >
    <div class="d-flex">
      <span class="State bg-green mr-2" title="Status: Open">
        Active
      </span>
      <h3 v-text="proposal.payload.name" />
    </div>
    <div>
      <span v-text="`#${i}`" class="text-gray" />
      Started on
      {{ $d(new Date(proposal.payload.startBlock * 1e3), 'short') }} by
      {{ _shorten(proposal.authors[0]) }} end on
      {{ $d(new Date(proposal.payload.endBlock * 1e3), 'short') }}
    </div>
  </router-link>
</template>

<script>
export default {
  props: {
    token: String,
    proposal: Object,
    i: String
  }
};
</script>
