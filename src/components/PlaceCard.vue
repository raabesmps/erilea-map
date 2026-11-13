<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BOOKS, useAppStore } from '../stores/app'
import { visibleNotes } from '../lib/spoiler'
import { ICONS } from '../lib/icons'

const store = useAppStore()
const { t } = useI18n()
const place = computed(() => store.currentPlace)
const notes = computed(() => (place.value ? visibleNotes(place.value, store.book) : []))
</script>

<template>
  <Transition name="card">
    <aside v-if="place" :key="place.id" class="surface card" role="dialog" :aria-label="place.nome[store.lang]">
      <button class="close" :aria-label="t('close')" @click="store.openPlace(null)">×</button>
      <div class="kind">
        <span class="ico" v-html="ICONS[place.tipo]" />
        {{ t(`types.${place.tipo}`) }}
      </div>
      <h2>{{ place.nome[store.lang] }}</h2>
      <p v-for="n in notes" :key="n.livro + n.pt" class="note">
        <span class="tag">{{ n.livro === 0 ? t('prelude') : `${t('book')} ${n.livro}` }}</span>
        {{ n[store.lang] }}
      </p>
      <p class="appears">
        {{ t('appearsIn') }} <em>{{ BOOKS[place.livro]![store.lang] }}</em>
      </p>
    </aside>
  </Transition>
</template>

<style scoped>
.card {
  position: absolute;
  z-index: 1100;
  top: 96px;
  right: var(--gutter);
  width: min(360px, calc(100vw - 2 * var(--gutter)));
  padding: 18px 20px 16px;
}
h2 {
  margin: 4px 0 10px;
  font-family: var(--font-title);
  font-size: 24px;
  letter-spacing: 0.04em;
  line-height: 1.15;
}
.kind {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--wax);
}
.ico {
  display: inline-grid;
  width: 18px;
  height: 18px;
}
.note {
  margin: 0 0 10px;
  line-height: 1.4;
}
.tag {
  display: inline-block;
  margin-right: 6px;
  padding: 0 7px;
  border: 1px solid var(--gold);
  border-radius: 999px;
  font-family: var(--font-title);
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  vertical-align: 1px;
}
.appears {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px dashed var(--ink-soft);
  font-size: 15px;
  opacity: 0.85;
}
.close {
  position: absolute;
  top: 6px;
  right: 10px;
  border: 0;
  background: none;
  font-size: 28px;
  line-height: 1;
}

.card-enter-active,
.card-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 720px) {
  .card {
    top: auto;
    bottom: 44px;
    right: var(--gutter);
    left: var(--gutter);
    width: auto;
    max-height: 45vh;
    overflow: auto;
  }
  .card-enter-from,
  .card-leave-to {
    transform: translateY(24px);
  }
}
</style>
