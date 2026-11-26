import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W } from '../geografia'
import { candidatosPorPrioridade, h2, sm } from './amostragem'

describe('amostragem de baixo nível', () => {
  it('h2 é determinístico, fica em [0,1) e muda com cada argumento', () => {
    for (let i = 0; i < 500; i++) {
      const v = h2(i * 7, i * 13, i % 9)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(h2(i * 7, i * 13, i % 9)).toBe(v)
    }
    expect(h2(1, 2, 3)).not.toBe(h2(2, 2, 3))
    expect(h2(1, 2, 3)).not.toBe(h2(1, 3, 3))
    expect(h2(1, 2, 3)).not.toBe(h2(1, 2, 4))
  })

  it('sm é o smoothstep: 0 antes de a, 1 depois de b, 0,5 no meio', () => {
    expect(sm(0.2, 0.8, 0)).toBe(0)
    expect(sm(0.2, 0.8, 1)).toBe(1)
    expect(sm(0.2, 0.8, 0.5)).toBeCloseTo(0.5, 12)
  })

  it('candidatosPorPrioridade devolve EXATAMENTE a sequência que o laço original de Terrasen produzia', () => {
    // the loop that lived inside planejarTerrasen before step 0c.2, copied verbatim, as an oracle
    const W = MAP_W
    const H = MAP_H
    const original: { x: number; y: number; pri: number }[] = []
    for (let gy = 0; gy < 0.32 * H; gy += 8) {
      for (let gx = 0.5 * W; gx < 0.92 * W; gx += 8) {
        original.push({ x: gx + (h2(gx, gy, 1) - 0.5) * 8, y: gy + (h2(gx, gy, 2) - 0.5) * 8, pri: h2(gx, gy, 3) })
      }
    }
    original.sort((a, b) => b.pri - a.pri)
    const novo = candidatosPorPrioridade(0.5 * W, 0, 0.92 * W, 0.32 * H, 8)
    expect(novo.length).toBe(original.length)
    expect(novo.length).toBe(8568) // 126 columns x 68 rows
    expect(novo).toEqual(original)
  })

  it('a ordem é de prioridade decrescente e repetível', () => {
    const a = candidatosPorPrioridade(100, 100, 400, 300, 10)
    for (let i = 1; i < a.length; i++) expect(a[i]!.pri).toBeLessThanOrEqual(a[i - 1]!.pri)
    expect(candidatosPorPrioridade(100, 100, 400, 300, 10)).toEqual(a)
  })
})
