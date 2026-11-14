import { describe, expect, it } from 'vitest'
import { clampBook, searchPlaces, visibleNotes, visiblePlaces, visibleRoutes } from './spoiler'
import type { Place, Route } from '../types'

const mk = (id: string, livro: number, notas: Place['notas'] = []): Place => ({
  id,
  geo: 'terra',
  x: 0.5,
  y: 0.5,
  tipo: 'cidade',
  livro,
  nome: { pt: id, en: id },
  notas,
})

const places = [
  mk('prelude', 0),
  mk('one', 1),
  mk('four', 4, [
    { livro: 4, pt: 'quatro', en: 'four' },
    { livro: 1, pt: 'um', en: 'one' },
  ]),
]

describe('spoiler filter', () => {
  it('book 0 shows only the prelude', () => {
    expect(visiblePlaces(places, 0).map((p) => p.id)).toEqual(['prelude'])
  })

  it('never shows a book-4 place at book 1', () => {
    expect(visiblePlaces(places, 1).map((p) => p.id)).toEqual(['prelude', 'one'])
  })

  it('keeps notes layered and ordered', () => {
    const four = places[2]!
    expect(visibleNotes(four, 1).map((n) => n.en)).toEqual(['one'])
    expect(visibleNotes(four, 4).map((n) => n.en)).toEqual(['one', 'four'])
  })

  it('filters routes by book', () => {
    const routes: Route[] = [
      { id: 'a', livro: 1, nome: { pt: 'a', en: 'a' }, pontos: [] },
      { id: 'b', livro: 3, nome: { pt: 'b', en: 'b' }, pontos: [] },
    ]
    expect(visibleRoutes(routes, 2).map((r) => r.id)).toEqual(['a'])
  })

  it('search cannot find locked places', () => {
    expect(searchPlaces(places, 1, 'pt', 'four')).toEqual([])
    expect(searchPlaces(places, 4, 'pt', 'FOUR').map((p) => p.id)).toEqual(['four'])
  })

  it('search ignores accents', () => {
    const p = [{ ...mk('x', 0), nome: { pt: 'Baía da Caveira', en: 'Skull’s Bay' } }]
    expect(searchPlaces(p, 0, 'pt', 'baia').length).toBe(1)
  })

  it('clamps invalid book values from the URL', () => {
    expect(clampBook('abc', 7)).toBe(0)
    expect(clampBook('99', 7)).toBe(7)
    expect(clampBook('-3', 7)).toBe(0)
    expect(clampBook('3', 7)).toBe(3)
  })
})
