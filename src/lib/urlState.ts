import { watch } from 'vue'
import type { Router } from 'vue-router'
import { useAppStore } from '../stores/app'
import { i18n } from '../i18n'

/** Two-way sync between the URL query (?livro=&lang=&lugar=) and the store. */
export function useUrlState(router: Router) {
  const store = useAppStore()
  const q = router.currentRoute.value.query

  const lang = q.lang === 'en' || q.lang === 'pt' ? q.lang : (i18n.global.locale.value as 'pt' | 'en')
  store.setLang(lang)
  store.setBook(q.livro ?? 1)
  if (typeof q.lugar === 'string') store.openPlace(q.lugar)

  watch(
    () => store.lang,
    (l) => {
      i18n.global.locale.value = l
      document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'
    },
    { immediate: true },
  )

  watch(
    () => [store.book, store.lang, store.placeId] as const,
    ([book, lang, lugar]) => {
      const query: Record<string, string> = { livro: String(book), lang }
      if (lugar) query.lugar = lugar
      router.replace({ query })
    },
    { immediate: true },
  )
}
