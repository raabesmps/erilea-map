<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const { t } = useI18n()
</script>

<template>
  <div class="style" role="group" :aria-label="t('style.label')">
    <button :class="{ on: store.style === 'colorido' }" :aria-pressed="store.style === 'colorido'" @click="store.setStyle('colorido')">
      {{ t('style.color') }}
    </button>
    <button :class="{ on: store.style === 'classico' }" :aria-pressed="store.style === 'classico'" @click="store.setStyle('classico')">
      {{ t('style.classic') }}
    </button>
  </div>
</template>

<style scoped>
.style {
  display: inline-flex;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
  background: var(--paper-light);
  flex: none;
}
button {
  border: 0;
  background: transparent;
  padding: 6px 11px;
  font-family: var(--font-title);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.06em;
}
button.on {
  background: var(--wax);
  color: var(--paper-light);
}
</style>
