<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const { t } = useI18n()
</script>

<template>
  <section v-if="store.routes.length" class="surface routes" :aria-label="t('routes')">
    <h3>{{ t('routes') }}</h3>
    <button v-for="r in store.routes" :key="r.id" :title="t('play')" @click="store.play(r.id)">
      <span class="play" aria-hidden="true">▶</span>
      {{ r.nome[store.lang] }}
    </button>
  </section>
</template>

<style scoped>
.routes {
  position: absolute;
  z-index: 1000;
  left: var(--gutter);
  bottom: 44px;
  padding: 10px 12px;
  display: grid;
  gap: 4px;
  max-width: min(320px, calc(100vw - 2 * var(--gutter)));
}
h3 {
  margin: 0 0 2px;
  font-family: var(--font-title);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--wax);
}
button {
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  border: 0;
  background: none;
  padding: 5px 4px;
  border-radius: 4px;
  font-size: 15px;
}
button:hover {
  background: var(--paper-dark);
}
.play {
  font-size: 10px;
  color: var(--wax);
}
@media (max-width: 720px) {
  .routes {
    bottom: auto;
    top: 150px;
    left: var(--gutter);
  }
}
</style>
