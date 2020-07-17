<template>
  <div>
    <Container>
      <h2 class="mb-3">Dashboard</h2>
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
            <h2>{{ token.name }} {{ token.symbol }}</h2>
            <div v-if="token.verified.length > 0">
              <Avatar
                v-for="verified in token.verified.slice(0, 5)"
                :key="verified"
                :address="verified"
                :title="verified"
                size="16"
                class="ml-2"
              />
              <Icon name="check" size="22" class="v-align-middle ml-2 mr-1" />
              {{ $n(token.verified.length) }}
            </div>
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
