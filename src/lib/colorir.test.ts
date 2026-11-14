import { describe, expect, it } from 'vitest'
import biomas from '../data/biomas.json'
import lugaresJson from '../data/lugares.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from './geografia'
import { tracarRios } from './colorir'
import type { Place } from '../types'

const lugares = lugaresJson as Place[]
function riosDe(geo: 'v1' | 'v2' | 'v3') {
  const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, geo)
  const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
  return { at, rios: tracarRios({ W: MAP_W, H: MAP_H, at, noise: ruido }) }
}
const { at, rios } = riosDe('v1')

describe('rios', () => {
  it('só o Avery tem nome; nenhum outro curso recebe nome sem confirmação', () => {
    for (const r of biomas.rios) {
      if (r.id === 'avery') expect(r.nome).toEqual({ pt: 'Rio Avery', en: 'Avery River' })
      else expect('nome' in r, r.id).toBe(false)
    }
  })

  it('todo rio desenhado nasce em terra e chega ao mar', () => {
    expect(rios.length).toBeGreaterThan(0)
    for (const r of rios) {
      const first = r.pts[0]!
      const last = r.pts[r.pts.length - 1]!
      expect(at(Math.round(first.x), Math.round(first.y)), `${r.id} nasce`).toBeGreaterThan(0)
      expect(at(Math.round(last.x), Math.round(last.y)), `${r.id} desemboca`).toBeLessThanOrEqual(0)
    }
  })

  it('o Avery passa pelo Forte da Fenda e corre para leste', () => {
    const avery = rios.find((r) => r.id === 'avery')!
    const fenda = lugares.find((p) => p.id === 'rifthold')!
    const perto = Math.min(...avery.pts.map((q) => Math.hypot(q.x - fenda.x * MAP_W, q.y - fenda.y * MAP_H)))
    expect(perto).toBeLessThan(30)
    expect(avery.pts[avery.pts.length - 1]!.x).toBeGreaterThan(avery.pts[0]!.x)
  })

  it('rios removidos por serem inventados não voltam', () => {
    const ids = biomas.rios.map((r) => r.id)
    for (const r of biomas._rios_removidos) {
      expect(ids, r.id).not.toContain(r.id)
      expect(r.motivo.length, r.id).toBeGreaterThan(10)
    }
  })
})

describe('rios na costa candidata (v2)', () => {
  const v2 = riosDe('v2')

  it('todo rio nasce em terra e chega ao mar', () => {
    expect(v2.rios.length).toBeGreaterThan(0)
    for (const r of v2.rios) {
      const first = r.pts[0]!
      const last = r.pts[r.pts.length - 1]!
      expect(v2.at(Math.round(first.x), Math.round(first.y)), `${r.id} nasce`).toBeGreaterThan(0)
      expect(v2.at(Math.round(last.x), Math.round(last.y)), `${r.id} desemboca`).toBeLessThanOrEqual(0)
    }
  })

  it('o Avery desemboca na costa do Forte da Fenda', () => {
    const avery = v2.rios.find((r) => r.id === 'avery')!
    const fenda = lugares.find((p) => p.id === 'rifthold')!
    const foz = avery.pts[avery.pts.length - 1]!
    expect(Math.hypot(foz.x - fenda.x * MAP_W, foz.y - fenda.y * MAP_H)).toBeLessThan(60)
  })
})

describe('rios na costa candidata (v3)', () => {
  const v3 = riosDe('v3')

  it('todo rio nasce em terra e chega ao mar', () => {
    expect(v3.rios.length).toBeGreaterThan(0)
    for (const r of v3.rios) {
      const first = r.pts[0]!
      const last = r.pts[r.pts.length - 1]!
      expect(v3.at(Math.round(first.x), Math.round(first.y)), `${r.id} nasce`).toBeGreaterThan(0)
      expect(v3.at(Math.round(last.x), Math.round(last.y)), `${r.id} desemboca`).toBeLessThanOrEqual(0)
    }
  })

  it('o Avery desemboca junto ao Forte da Fenda', () => {
    const avery = v3.rios.find((r) => r.id === 'avery')!
    const fenda = lugares.find((p) => p.id === 'rifthold')!
    const foz = avery.pts[avery.pts.length - 1]!
    expect(Math.hypot(foz.x - fenda.x * MAP_W, foz.y - fenda.y * MAP_H)).toBeLessThan(60)
  })
})
