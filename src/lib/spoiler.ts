import type { Lang, Note, Place, Route } from '../types'

/** Places unlocked by the chosen book (book 0 = prelude). */
export function visiblePlaces(places: Place[], book: number): Place[] {
  return places.filter((p) => p.livro <= book)
}

export function visibleRoutes(routes: Route[], book: number): Route[] {
  return routes.filter((r) => r.livro <= book)
}

/** Layered notes: only those safe up to the chosen book, in book order. */
export function visibleNotes(place: Place, book: number): Note[] {
  return place.notas.filter((n) => n.livro <= book).sort((a, b) => a.livro - b.livro)
}

export function isUnlocked(item: { livro: number }, book: number): boolean {
  return item.livro <= book
}

export function clampBook(value: unknown, max: number): number {
  const n = Number(value)
  if (!Number.isInteger(n)) return 0
  return Math.min(Math.max(n, 0), max)
}

/** Case/accent-insensitive search over unlocked places only. */
export function searchPlaces(places: Place[], book: number, lang: Lang, query: string): Place[] {
  const q = fold(query)
  if (!q) return []
  return visiblePlaces(places, book).filter((p) => fold(p.nome[lang]).includes(q))
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
