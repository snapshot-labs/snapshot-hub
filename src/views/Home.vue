<template>
  <div>
    <Container>
      <h1 class="mb-3">Explore</h1>
    </Container>
    <Container :slim="true">
      <router-link
        v-for="token in tokens"
        :key="token.token"
        :to="{ name: 'proposals', params: { key: token.key } }"
      >
        <Block class="text-center">
          <Token :address="token.token" size="128" class="mb-4" />
          <div>
            <h2>{{ token.name }}</h2>
            <h3>{{ token.symbol }}</h3>
          </div>
        </Block>
      </router-link>
    </Container>
  </div>
</template>

<script>
import tokens from '@/helpers/tokens.json';

export default {
  data() {
    return {
      tokens
    };
  }
};
</script>
