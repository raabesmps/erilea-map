<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import MapaView from '../components/MapaView.vue'
import BookSelector from '../components/BookSelector.vue'
import LangToggle from '../components/LangToggle.vue'
import StyleToggle from '../components/StyleToggle.vue'
import SearchBox from '../components/SearchBox.vue'
import PlaceCard from '../components/PlaceCard.vue'
import RouteControls from '../components/RouteControls.vue'
import AppFooter from '../components/AppFooter.vue'
import { useUrlState } from '../lib/urlState'

const { t } = useI18n()
useUrlState(useRouter())
</script>

<template>
  <div class="page">
    <MapaView />
    <header class="surface bar">
      <div class="brand">
        <h1>{{ t('title') }}</h1>
        <p>{{ t('subtitle') }}</p>
      </div>
      <BookSelector class="center" />
      <div class="tools">
        <SearchBox />
        <StyleToggle />
        <LangToggle />
      </div>
    </header>
    <RouteControls />
    <PlaceCard />
    <AppFooter />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  height: 100%;
}
.bar {
  position: absolute;
  z-index: 1000;
  top: var(--gutter);
  left: var(--gutter);
  right: var(--gutter);
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 10px 18px;
}
h1 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 22px;
  letter-spacing: 0.1em;
  line-height: 1;
}
.brand p {
  margin: 3px 0 0;
  font-size: 14px;
  font-style: italic;
  color: var(--ink-soft);
}
.tools {
  display: flex;
  gap: 10px;
  align-items: center;
}
.tools > :first-child {
  width: 220px;
}

@media (max-width: 720px) {
  .bar {
    grid-template-columns: 1fr auto;
    gap: 8px 10px;
    padding: 8px 12px;
  }
  .center {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .tools {
    grid-column: 1 / -1;
    grid-row: 3;
    flex-wrap: wrap;
  }
  .tools > :first-child {
    flex: 1 1 100%;
    width: auto;
  }
  .brand p {
    display: none;
  }
  h1 {
    font-size: 18px;
  }
}
</style>
