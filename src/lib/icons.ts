import type { IconKey, Place } from '../types'

const wrap = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

export const ICONS: Record<IconKey, string> = {
  vidro: wrap('<path d="M5 20V10l3-2 4-5 4 5 3 2v10zM9 20v-6h6v6M12 3v5M8 12l4 3 4-3"/>'),
  muralha: wrap('<path d="M3 20V9h3v2h3V9h6v2h3V9h3v11zM10 20v-5h4v5M12 3v5M12 3l3 1.5-3 1.5"/>'),
  cidade: wrap('<path d="M4 20V11l4-2v11M10 20V5l4-2 4 2v15M3 20h18M12.5 9h1M12.5 13h1"/>'),
  fortaleza: wrap('<path d="M4 20V8h3v3h3V8h4v3h3V8h3v12zM10 20v-5h4v5"/>'),
  floresta: wrap('<path d="M12 3l6 9h-3l4 6H5l4-6H6zM12 18v3"/>'),
  montanha: wrap('<path d="M3 20l6-11 4 6 3-4 5 9z"/>'),
  regiao: wrap('<path d="M12 3l7 9-7 9-7-9z"/>'),
  porto: wrap('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M6 13a6 6 0 0 0 12 0M8 10h8"/>'),
  saida: wrap('<path d="M4 12h14M13 6l6 6-6 6"/>'),
  mar: wrap('<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>'),
  mina: wrap('<path d="M5 19L15 9M9 5c4-2 8 0 10 4M15 9l-3-3"/>'),
}

/** Icon for a place: its special icon if it has one, otherwise by type. */
export const iconFor = (p: Pick<Place, 'tipo' | 'icone'>): string => ICONS[p.icone ?? p.tipo]
