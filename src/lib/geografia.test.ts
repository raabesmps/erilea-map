import { describe, expect, it } from 'vitest'
import { COSTA_MAX_PX, criarGeografia, distanciaCosta, encontrarLagos, GEOGRAFIAS, MAP_H, MAP_W, mulberry32, TERRA_MIN_PX, validarLugares } from './geografia'
import lugaresJson from '../data/lugares.json'
import type { Place } from '../types'

const lugares = lugaresJson as Place[]
const base = criarGeografia(mulberry32(11))

describe('terreno v1: a refatoração não mudou o mapa aprovado', () => {
  // Values captured from the renderer before elevation was extracted to geografia.ts.
  const referencia: [number, number, number][] = [
    [100, 100, -0.995852],
    [1200, 840, 0.917904],
    [1800, 700, 0.768104],
    [500, 1200, 0.960295],
    [2200, 300, -0.341308],
    [1500, 1300, 0.391657],
    [1860, 790, 0.749673],
  ]
  it.each(referencia)('elevação em (%i, %i)', (x, y, esperado) => {
    expect(base.elevacao(x, y)).toBeCloseTo(esperado, 5)
  })

  it('é determinística para a mesma semente', () => {
    const outra = criarGeografia(mulberry32(11))
    expect(outra.elevacao(1234, 567)).toBe(base.elevacao(1234, 567))
  })
})

describe('validarLugares', () => {
  const lugar = (geo: Place['geo'], x: number, y: number): Place => ({
    id: 't', geo, x, y, tipo: 'cidade', livro: 0, nome: { pt: 't', en: 't' }, notas: [],
  })
  // a synthetic island: land inside radius 300px, water outside
  const ilha = (x: number, y: number) => 300 - Math.hypot(x - MAP_W / 2, y - MAP_H / 2)

  it('mar na água passa; mar em terra falha', () => {
    expect(validarLugares([lugar('mar', 0.1, 0.1)], ilha, MAP_W, MAP_H, false)).toEqual([])
    expect(validarLugares([lugar('mar', 0.5, 0.5)], ilha, MAP_W, MAP_H, false)).toHaveLength(1)
  })

  it('terra no centro passa; terra na água falha; terra na beira falha', () => {
    expect(validarLugares([lugar('terra', 0.5, 0.5)], ilha, MAP_W, MAP_H, false)).toEqual([])
    expect(validarLugares([lugar('terra', 0.1, 0.1)], ilha, MAP_W, MAP_H, false)[0]!.motivo).toBe('está na água')
    const beira = 0.5 + (300 - (TERRA_MIN_PX - 10)) / MAP_W
    expect(validarLugares([lugar('terra', beira, 0.5)], ilha, MAP_W, MAP_H, false)[0]!.motivo).toMatch(/interior/)
  })

  it('costa na beira passa; costa no centro falha', () => {
    const beira = 0.5 + (300 - (COSTA_MAX_PX - 15)) / MAP_W
    expect(validarLugares([lugar('costa', beira, 0.5)], ilha, MAP_W, MAP_H, false)).toEqual([])
    expect(validarLugares([lugar('costa', 0.5, 0.5)], ilha, MAP_W, MAP_H, false)[0]!.motivo).toMatch(/costeiro/)
  })

  it('distanciaCosta mede a distância até a água', () => {
    expect(distanciaCosta(ilha, MAP_W / 2, MAP_H / 2)).toBeGreaterThanOrEqual(296)
    expect(distanciaCosta(ilha, MAP_W / 2, MAP_H / 2)).toBeLessThanOrEqual(304)
  })
})

describe('geografia v1 (forma aprovada): coerência lugares x costa', () => {
  // Known mismatches of the approved v1 shape. The candidate v2 must clear all of them,
  // and v1 may never get worse than this list.
  const CONHECIDAS = [
    'amaroth',
    'banjali',
    'desertos-congelados',
    'enseada-sino',
    'meah',
    'penhasco-adustos',
    'rifthold',
    'ruhnn',
    'skulls-bay',
    'suria',
  ]

  it('v1 não piora: só viola o que já era conhecido', () => {
    // control points only apply to the candidate shape; v1 is judged on the places alone
    const ids = validarLugares(lugares, base.elevacao).map((v) => v.id).filter((id) => !id.startsWith('controle'))
    for (const id of ids) expect(CONHECIDAS, `nova violação em ${id}`).toContain(id)
  })

  it('o conjunto de lugares "mar" realmente está na água', () => {
    const naoMar = validarLugares(lugares, base.elevacao).filter((v) => v.motivo === 'deveria estar na água')
    expect(naoMar).toEqual([])
  })

  it('as duas formas existem', () => {
    expect(Object.keys(GEOGRAFIAS)).toEqual(['v1', 'v2'])
  })
})

describe('geografia v2 (candidata): coerência lugares x costa', () => {
  const v2 = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v2')

  it('nenhum lugar viola a costa', () => {
    expect(validarLugares(lugares, v2.elevacao)).toEqual([])
  })

  it('a área de terra fica próxima da v1 (identidade visual preservada)', () => {
    const v1 = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v1')
    const fracao = (fn: (x: number, y: number) => number) => {
      let n = 0
      let t = 0
      for (let j = 0; j < 56; j++) {
        for (let i = 0; i < 80; i++) {
          t++
          if (fn(((i + 0.5) / 80) * MAP_W, ((j + 0.5) / 56) * MAP_H) > 0) n++
        }
      }
      return n / t
    }
    expect(Math.abs(fracao(v2.elevacao) - fracao(v1.elevacao))).toBeLessThan(0.02)
  })

  it('a baía interna inventada na v1 virou terra (Desertos Congelados e Ruhnn em terra firme)', () => {
    for (const id of ['desertos-congelados', 'ruhnn']) {
      const p = lugares.find((l) => l.id === id)!
      expect(v2.elevacao(p.x * MAP_W, p.y * MAP_H), id).toBeGreaterThan(0)
      expect(distanciaCosta(v2.elevacao, p.x * MAP_W, p.y * MAP_H), id).toBeGreaterThanOrEqual(TERRA_MIN_PX)
    }
  })

  it('o Forte da Fenda está na costa e a seta de Wendlyn no mar', () => {
    const fenda = lugares.find((l) => l.id === 'rifthold')!
    const w = lugares.find((l) => l.id === 'wendlyn')!
    expect(v2.elevacao(fenda.x * MAP_W, fenda.y * MAP_H)).toBeGreaterThan(0)
    expect(distanciaCosta(v2.elevacao, fenda.x * MAP_W, fenda.y * MAP_H)).toBeLessThanOrEqual(COSTA_MAX_PX)
    expect(v2.elevacao(w.x * MAP_W, w.y * MAP_H)).toBeLessThanOrEqual(0)
  })

  it('não há água isolada: lagos não estão modelados, então seriam inventados', () => {
    expect(encontrarLagos(v2.elevacao)).toEqual([])
  })
})
