<template>
  <router-link
    class="px-4 py-3 border-top d-block"
    :to="{ name: 'proposal', params: { key: token, id: i } }"
  >
    <div>
      <State :proposal="proposal" class="d-inline-block mr-2 mb-2" />
      <h3 v-text="proposal.payload.name" class="d-inline-block mb-1" />
    </div>
    <div>
      <span v-text="`#${i}`" class="text-gray" />
      By {{ _shorten(proposal.authors[0]) }}
      started on
      {{ $d(new Date(proposal.payload.startBlock * 1e3), 'short') }}
      end on
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
