<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BOOKS, useAppStore } from '../stores/app'

const store = useAppStore()
const { t } = useI18n()
const current = computed(() => BOOKS[store.book]!)
</script>

<template>
  <div class="books">
    <div class="rail" role="radiogroup" :aria-label="t('book')">
      <button
        v-for="b in BOOKS"
        :key="b.id"
        class="dot"
        :class="{ on: b.id === store.book, read: b.id < store.book }"
        role="radio"
        :aria-checked="b.id === store.book"
        :title="b[store.lang]"
        @click="store.setBook(b.id)"
      >
        {{ b.id === 0 ? '✦' : b.id }}
      </button>
    </div>
    <p class="caption">
      <span class="muted">{{ t('readUpTo') }}</span>
      <strong>{{ current[store.lang] }}</strong>
    </p>
  </div>
</template>

<style scoped>
.books {
  display: grid;
  gap: 4px;
  justify-items: center;
  min-width: 0;
}
.rail {
  display: flex;
  gap: 6px;
  padding: 2px;
  max-width: 100%;
  overflow-x: auto;
}
.dot {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--ink);
  background: var(--paper-light);
  font-family: var(--font-title);
  font-weight: 700;
  font-size: 14px;
  transition: all 0.18s ease;
}
.dot.read {
  background: var(--paper-dark);
}
.dot.on {
  background: var(--wax);
  color: var(--paper-light);
  transform: translateY(-2px) scale(1.1);
  box-shadow: 0 3px 8px rgba(30, 18, 6, 0.5);
}
.dot:hover:not(.on) {
  background: var(--gold);
  color: var(--paper-light);
}
.caption {
  margin: 0;
  font-size: 15px;
  text-align: center;
  line-height: 1.15;
}
.muted {
  opacity: 0.7;
  margin-right: 6px;
  font-style: italic;
}
strong {
  font-family: var(--font-title);
  font-size: 14px;
  letter-spacing: 0.05em;
}
</style>
