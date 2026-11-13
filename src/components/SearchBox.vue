<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'
import { searchPlaces } from '../lib/spoiler'

const store = useAppStore()
const { t } = useI18n()
const q = ref('')
const focused = ref(false)
const results = computed(() => searchPlaces(store.places, store.book, store.lang, q.value).slice(0, 6))

function onBlur() {
  setTimeout(() => (focused.value = false), 150)
}

function pick(id: string) {
  store.flyTo(id)
  q.value = ''
  focused.value = false
}
</script>

<template>
  <div class="search">
    <input
      v-model="q"
      type="search"
      :placeholder="t('search')"
      :aria-label="t('search')"
      @focus="focused = true"
      @blur="onBlur"
      @keydown.enter="results[0] && pick(results[0].id)"
    />
    <ul v-if="focused && q" class="surface results">
      <li v-for="p in results" :key="p.id">
        <button @mousedown.prevent="pick(p.id)">{{ p.nome[store.lang] }}</button>
      </li>
      <li v-if="!results.length" class="empty">{{ t('noResults') }}</li>
    </ul>
  </div>
</template>

<style scoped>
.search {
  position: relative;
}
input {
  width: 100%;
  padding: 8px 14px;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  background: var(--paper-light);
  font: inherit;
  font-size: 16px;
  color: var(--ink);
}
input::placeholder {
  color: var(--ink-soft);
  opacity: 0.7;
  font-style: italic;
}
.results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  z-index: 1200;
}
.results button {
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  padding: 8px 10px;
  border-radius: 4px;
}
.results button:hover {
  background: var(--paper-dark);
}
.empty {
  padding: 8px 10px;
  font-style: italic;
  opacity: 0.75;
}
</style>
