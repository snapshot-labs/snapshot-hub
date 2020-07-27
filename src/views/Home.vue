<template>
  <div>
    <Container>
      <h2 class="mb-3">Dashboard</h2>
    </Container>
    <Container :slim="true">
      <router-link
        v-for="namespace in namespaces"
        :key="namespace.token"
        :to="{ name: 'proposals', params: { key: namespace.key } }"
      >
        <Block class="text-center">
          <Token :address="namespace.token" size="128" class="mb-4" />
          <div>
            <h2>{{ namespace.name }} {{ namespace.symbol }}</h2>
            <div v-if="namespace.verified.length > 0">
              <Avatar
                v-for="verified in namespace.verified.slice(0, 5)"
                :key="verified"
                :address="verified"
                :title="verified"
                size="16"
                class="ml-2"
              />
              <Icon name="check" size="22" class="v-align-middle ml-2 mr-1" />
              {{ $n(namespace.verified.length) }}
            </div>
          </div>
        </Block>
      </router-link>
    </Container>
  </div>
</template>

<script>
import namespaces from '@/namespaces.json';

export default {
  data() {
    return {
      namespaces: Object.fromEntries(
        Object.entries(namespaces).filter(namespace => namespace[1].visible)
      )
    };
  }
};
</script>
