import { watch } from 'vue'
import type { Router } from 'vue-router'
import { useAppStore } from '../stores/app'
import { i18n } from '../i18n'
import { GEO_PADRAO } from './geografia'

/** Two-way sync between the URL query (?livro=&lang=&lugar=) and the store. */
export function useUrlState(router: Router) {
  const store = useAppStore()
  const q = router.currentRoute.value.query

  const lang = q.lang === 'en' || q.lang === 'pt' ? q.lang : (i18n.global.locale.value as 'pt' | 'en')
  store.setLang(lang)
  store.setBook(q.livro ?? 1)
  let savedStyle: string | null = null
  try {
    savedStyle = localStorage.getItem('erilea-style')
  } catch {
    /* storage unavailable */
  }
  store.setStyle((q.estilo ?? savedStyle) === 'classico' ? 'classico' : 'colorido')
  if (typeof q.lugar === 'string') store.openPlace(q.lugar)
  store.geo = q.geo === '1' ? 'v1' : q.geo === '2' ? 'v2' : GEO_PADRAO

  watch(
    () => store.lang,
    (l) => {
      i18n.global.locale.value = l
      document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'
    },
    { immediate: true },
  )

  watch(
    () => [store.book, store.lang, store.placeId, store.style] as const,
    ([book, lang, lugar, estilo]) => {
      const query: Record<string, string> = { livro: String(book), lang }
      if (lugar) query.lugar = lugar
      if (estilo === 'classico') query.estilo = estilo
      if (store.geo !== GEO_PADRAO) query.geo = store.geo.slice(1)
      router.replace({ query })
    },
    { immediate: true },
  )
}
