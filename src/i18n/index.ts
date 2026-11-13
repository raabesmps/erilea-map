import { createI18n } from 'vue-i18n'
import pt from './pt'
import en from './en'
import type { Lang } from '../types'

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('erilea-lang')
    if (saved === 'pt' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLang(),
  fallbackLocale: 'pt',
  messages: { pt, en },
})
