import { describe, expect, it } from 'vitest'
import lugaresJson from '../../data/lugares.json'
import rotasJson from '../../data/rotas.json'
import type { Obstaculos } from '../hidrografia'
import { MAP_H, MAP_W } from '../geografia'
import { criarAceitador } from './aceitador'
import { criarOcupacao } from './ocupacao'

const W = MAP_W
const H = MAP_H
const orynth = (lugaresJson as { id: string; x: number; y: number }[]).find((p) => p.id === 'orynth')!
const rota = (rotasJson as unknown as { pontos: [number, number][] }[])[2]!

type G = { x: number; y: number; tam: number }
const g = (x: number, y: number, tam = 10): G => ({ x, y, tam })
const base = { W, H, at: () => 1, peso: () => 1, pesoMin: 0.12, folgaIcone: 30, margemRota: 13 }

/** A spot that is far from every icon and route, found by scanning (so the test does not depend on a hard-coded point). */
function pontoLivre() {
  const a = criarAceitador<G>(base)
  for (let y = 900; y < 1600; y += 25) for (let x = 100; x < 800; x += 25) if (a.tentar(g(x, y), 10, 14)) return { x, y }
  throw new Error('sem ponto livre')
}

describe('aceitador', () => {
  const livre = pontoLivre()

  it('aceita um símbolo válido, registra na ocupação e na lista', () => {
    const a = criarAceitador<G>(base)
    expect(a.tentar(g(livre.x, livre.y), 10, 14)).toBe(true)
    expect(a.glifos).toHaveLength(1)
    expect(a.ocupacao.itens()).toEqual([{ x: livre.x, y: livre.y, r: 10 }])
  })

  const recusas: [string, (a: ReturnType<typeof criarAceitador<G>>) => boolean][] = [
    ['x < 8', (a) => a.tentar(g(7, livre.y), 10, 14)],
    ['y < 8', (a) => a.tentar(g(livre.x, 7), 10, 14)],
    ['x > W − 8', (a) => a.tentar(g(W - 7, livre.y), 10, 14)],
    ['água (elevação < 0,08)', () => criarAceitador<G>({ ...base, at: () => 0.07 }).tentar(g(livre.x, livre.y), 10, 14)],
    ['fora do bioma (peso < 0,12)', () => criarAceitador<G>({ ...base, peso: () => 0.11 }).tentar(g(livre.x, livre.y), 10, 14)],
    ['perto de um ícone', (a) => a.tentar(g(orynth.x * W + 20, orynth.y * H), 10, 14)],
    ['sob o rótulo do ícone', (a) => a.tentar(g(orynth.x * W + 40, orynth.y * H + 25), 10, 14)],
    ['perto de lago ou rio', () => criarAceitador<G>({ ...base, obst: { perto: () => true } as unknown as Obstaculos }).tentar(g(livre.x, livre.y), 10, 14)],
    ['perto de uma rota', (a) => a.tentar(g(rota.pontos[1]![0] * W, rota.pontos[1]![1] * H + 8), 10, 14)],
  ]
  for (const [nome, tenta] of recusas)
    it(`recusa: ${nome}, sem deixar rastro`, () => {
      const a = criarAceitador<G>(base)
      expect(tenta(a)).toBe(false)
      expect(a.glifos).toHaveLength(0)
      expect(a.ocupacao.itens()).toHaveLength(0)
    })

  it('recusa o que colide com a ocupação, mesmo que ela venha de outro bioma', () => {
    const compartilhada = criarOcupacao()
    compartilhada.ocupar(livre.x + 4, livre.y, 12) // taken by an earlier biome
    const a = criarAceitador<G>({ ...base, ocupacao: compartilhada })
    expect(a.tentar(g(livre.x, livre.y), 10, 14)).toBe(false)
    expect(a.tentar(g(livre.x + 60, livre.y), 10, 14)).toBe(true)
  })

  it('ordem das verificações: lago/rio só é consultado depois de passar nas anteriores', () => {
    let consultas = 0
    const obst = { perto: () => (consultas++, false) } as unknown as Obstaculos
    const a = criarAceitador<G>({ ...base, obst })
    a.tentar(g(7, livre.y), 10, 14) // fails the first check
    a.tentar(g(livre.x, livre.y), 10, 14) // passes everything before the water test
    expect(consultas).toBe(1)
  })

  it('a margem da água soma 0,8 do tamanho; a das rotas, 0,3 do tamanho', () => {
    const vistas: number[] = []
    const obst = { perto: (_x: number, _y: number, m: number) => (vistas.push(m), false) } as unknown as Obstaculos
    criarAceitador<G>({ ...base, obst }).tentar(g(livre.x, livre.y, 20), 10, 14)
    expect(vistas).toEqual([14 + 20 * 0.8])
  })
})
