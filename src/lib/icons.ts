import type { PlaceType } from '../types'

const wrap = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

export const ICONS: Record<PlaceType, string> = {
  cidade: wrap('<path d="M4 20V11l4-2v11M10 20V5l4-2 4 2v15M3 20h18M12.5 9h1M12.5 13h1"/>'),
  fortaleza: wrap('<path d="M4 20V8h3v3h3V8h4v3h3V8h3v12zM10 20v-5h4v5"/>'),
  floresta: wrap('<path d="M12 3l6 9h-3l4 6H5l4-6H6zM12 18v3"/>'),
  montanha: wrap('<path d="M3 20l6-11 4 6 3-4 5 9z"/>'),
  regiao: wrap('<path d="M12 3l7 9-7 9-7-9z"/>'),
  porto: wrap('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M6 13a6 6 0 0 0 12 0M8 10h8"/>'),
  mina: wrap('<path d="M5 19L15 9M9 5c4-2 8 0 10 4M15 9l-3-3"/>'),
}
