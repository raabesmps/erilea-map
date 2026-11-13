import { describe, expect, it } from 'vitest'
import { COSTA_MAX_PX, criarGeografia, distanciaCosta, GEOGRAFIAS, MAP_H, MAP_W, mulberry32, TERRA_MIN_PX, validarLugares } from './geografia'
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
    expect(validarLugares([lugar('mar', 0.1, 0.1)], ilha)).toEqual([])
    expect(validarLugares([lugar('mar', 0.5, 0.5)], ilha)).toHaveLength(1)
  })

  it('terra no centro passa; terra na água falha; terra na beira falha', () => {
    expect(validarLugares([lugar('terra', 0.5, 0.5)], ilha)).toEqual([])
    expect(validarLugares([lugar('terra', 0.1, 0.1)], ilha)[0]!.motivo).toBe('está na água')
    const beira = 0.5 + (300 - (TERRA_MIN_PX - 10)) / MAP_W
    expect(validarLugares([lugar('terra', beira, 0.5)], ilha)[0]!.motivo).toMatch(/interior/)
  })

  it('costa na beira passa; costa no centro falha', () => {
    const beira = 0.5 + (300 - (COSTA_MAX_PX - 15)) / MAP_W
    expect(validarLugares([lugar('costa', beira, 0.5)], ilha)).toEqual([])
    expect(validarLugares([lugar('costa', 0.5, 0.5)], ilha)[0]!.motivo).toMatch(/costeiro/)
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
    const ids = validarLugares(lugares, base.elevacao).map((v) => v.id)
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
