<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DEMO } from '../lib/demo'
const { t } = useI18n()
</script>

<template>
  <footer class="foot">
    <span>{{ t('footer') }}</span>
    <span class="sep"> · </span>
    <span>{{ t('interpretive') }}</span>
    <template v-if="DEMO">
      <span class="sep"> · </span>
      <span class="demo">{{ t('demo') }}</span>
    </template>
  </footer>
</template>

<style scoped>
.foot {
  position: absolute;
  z-index: 900;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6px var(--gutter);
  background: linear-gradient(0deg, rgba(43, 29, 18, 0.9), rgba(43, 29, 18, 0));
  color: var(--paper);
  font-size: 12.5px;
  text-align: center;
  line-height: 1.3;
  pointer-events: none;
}
.demo {
  font-style: italic;
  opacity: 0.85;
}
@media (max-width: 720px) {
  .foot span {
    display: block;
  }
  /* declared after the rule above (and more specific) so the separators really disappear on phones */
  .foot .sep {
    display: none;
  }
}
</style>
