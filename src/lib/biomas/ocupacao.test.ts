import { describe, expect, it } from 'vitest'
import { h2 } from './amostragem'
import { criarOcupacao } from './ocupacao'

describe('grade de ocupação', () => {
  it('recusa um disco a menos de 0,5 · (r + r′) · 0,95 de outro e aceita fora disso', () => {
    const o = criarOcupacao()
    o.ocupar(500, 500, 10)
    // limit distance for r = 10 against r' = 10 is 0.5 * 20 * 0.95 = 9.5
    expect(o.livre(509, 500, 10)).toBe(false)
    expect(o.livre(510, 500, 10)).toBe(true)
    expect(o.livre(500, 509.4, 10)).toBe(false)
    expect(o.livre(500, 509.6, 10)).toBe(true)
  })

  it('o raio das duas partes conta (um disco grande afasta mais)', () => {
    const o = criarOcupacao()
    o.ocupar(300, 300, 30)
    expect(o.livre(300 + 0.5 * (30 + 30) * 0.95 - 0.1, 300, 30)).toBe(false)
    expect(o.livre(300 + 0.5 * (30 + 4) * 0.95 + 0.1, 300, 4)).toBe(true)
    expect(o.livre(300 + 0.5 * (30 + 4) * 0.95 - 0.1, 300, 4)).toBe(false)
  })

  it('vale através da fronteira entre células de 40 px', () => {
    const o = criarOcupacao()
    o.ocupar(79.9, 79.9, 12)
    expect(o.livre(80.1, 80.1, 12)).toBe(false)
    expect(o.livre(120, 120, 12)).toBe(true)
  })

  it('coincide com a verificação ingênua (todos contra todos) em 2.000 tentativas determinísticas', () => {
    const o = criarOcupacao()
    const aceitos: { x: number; y: number; r: number }[] = []
    for (let i = 0; i < 2000; i++) {
      const x = 100 + h2(i, 1, 1) * 600
      const y = 100 + h2(i, 2, 2) * 400
      const r = 6 + h2(i, 3, 3) * 26
      const ingenuo = aceitos.every((a) => Math.hypot(a.x - x, a.y - y) >= 0.5 * (r + a.r) * 0.95)
      expect(o.livre(x, y, r), `tentativa ${i}`).toBe(ingenuo)
      if (ingenuo) {
        o.ocupar(x, y, r)
        aceitos.push({ x, y, r })
      }
    }
    expect(aceitos.length).toBeGreaterThan(50)
    expect(o.itens()).toEqual(aceitos)
  })

  it('duas ocupações são independentes; uma compartilhada enxerga o que o outro bioma ocupou', () => {
    const a = criarOcupacao()
    const b = criarOcupacao()
    a.ocupar(200, 200, 10)
    expect(b.livre(200, 200, 10)).toBe(true)
    expect(a.livre(200, 200, 10)).toBe(false)
  })
})
