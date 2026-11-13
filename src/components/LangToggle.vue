<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const { t } = useI18n()
</script>

<template>
  <div class="lang" role="group" :aria-label="t('language')">
    <button v-for="l in (['pt', 'en'] as const)" :key="l" :class="{ on: store.lang === l }" :aria-pressed="store.lang === l" @click="store.setLang(l)">
      {{ l.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang {
  display: inline-flex;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
  background: var(--paper-light);
}
button {
  border: 0;
  background: transparent;
  padding: 6px 12px;
  font-family: var(--font-title);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.08em;
}
button.on {
  background: var(--ink);
  color: var(--paper-light);
}
</style>
