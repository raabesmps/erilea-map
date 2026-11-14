import { describe, expect, it } from 'vitest'
import { BLOBS_V3, COSTA_MAX_PX, CORDAS_COSTEIRAS, CORDA_MAX_PX, PONTOS_V3, criarGeografia, distanciaCosta, encontrarIlhotas, encontrarLagos, trechosRetos, GEOGRAFIAS, MAP_H, MAP_W, mulberry32, TERRA_MIN_PX, validarLugares } from './geografia'
import lugaresJson from '../data/lugares.json'
import type { Place } from '../types'

const lugares = lugaresJson as Place[]
const base = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v1')

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
    const outra = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v1')
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
    expect(Object.keys(GEOGRAFIAS)).toEqual(['v1', 'v2', 'v3'])
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

describe('geografia v3 (candidata): costa leste orgânica e entrada marítima do norte', () => {
  const v3 = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
  const v2 = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v2')
  const LESTE = { x0: 0.72, x1: 0.92, y0: 0.3, y1: 0.66 }

  it('nenhum lugar, ponto de controle (com a entrada do norte) ou corda costeira é violado', () => {
    expect(validarLugares(lugares, v3.elevacao, MAP_W, MAP_H, PONTOS_V3, CORDAS_COSTEIRAS)).toEqual([])
  })

  it('a v2 violava as cordas e a cauda do norte: a v3 corrige o que a v2 deixava', () => {
    const viol = validarLugares(lugares, v2.elevacao, MAP_W, MAP_H, PONTOS_V3, CORDAS_COSTEIRAS)
    expect(viol.some((v) => v.id.startsWith('corda'))).toBe(true)
    expect(viol.some((v) => v.id.startsWith('controle'))).toBe(true)
  })

  it('a costa leste não tem trechos retos de régua (a v2 tinha)', () => {
    expect(trechosRetos(v3.elevacao, LESTE, MAP_W, MAP_H, 90, 5)).toEqual([])
    expect(trechosRetos(v2.elevacao, LESTE, MAP_W, MAP_H, 90, 5).length).toBeGreaterThan(0)
  })

  it('a corda de cada par de lugares costeiros fica a até 75 px da costa', () => {
    expect(CORDA_MAX_PX).toBe(75)
    for (const [a, b] of CORDAS_COSTEIRAS) {
      const pa = lugares.find((l) => l.id === a)!
      const pb = lugares.find((l) => l.id === b)!
      for (let t = 0.05; t <= 0.951; t += 0.05) {
        const d = distanciaCosta(v3.elevacao, (pa.x + (pb.x - pa.x) * t) * MAP_W, (pa.y + (pb.y - pa.y) * t) * MAP_H, 200)
        expect(d, `${a}->${b} @${t}`).toBeLessThanOrEqual(CORDA_MAX_PX)
      }
    }
  })

  it('Forte da Fenda, Meah e Enseada do Sino continuam na costa e não se moveram', () => {
    for (const [id, x, y] of [['rifthold', 0.776, 0.47], ['meah', 0.809, 0.317], ['enseada-sino', 0.853, 0.603]] as const) {
      const p = lugares.find((l) => l.id === id)!
      expect([p.x, p.y]).toEqual([x, y])
      expect(v3.elevacao(p.x * MAP_W, p.y * MAP_H), id).toBeGreaterThan(0)
      expect(distanciaCosta(v3.elevacao, p.x * MAP_W, p.y * MAP_H), id).toBeLessThanOrEqual(COSTA_MAX_PX)
    }
  })

  it('a entrada marítima do norte existe e termina onde o impresso a termina (y ≈ 0,13)', () => {
    const agua = (nx: number, ny: number) => v3.elevacao(nx * MAP_W, ny * MAP_H) <= 0
    expect(agua(0.5, 0.03)).toBe(true)
    expect(agua(0.48, 0.07)).toBe(true)
    expect(agua(0.5, 0.12)).toBe(true)
    // the old tail: nothing below the printed end
    for (const ny of [0.17, 0.19, 0.21, 0.23]) expect(agua(0.51, ny), `y=${ny}`).toBe(false)
  })

  it('a água do sul não voltou: Desertos Congelados e Ruhnn seguem em terra firme', () => {
    for (const id of ['desertos-congelados', 'ruhnn']) {
      const p = lugares.find((l) => l.id === id)!
      expect(distanciaCosta(v3.elevacao, p.x * MAP_W, p.y * MAP_H), id).toBeGreaterThanOrEqual(TERRA_MIN_PX)
    }
  })

  it('não há água isolada', () => {
    expect(encontrarLagos(v3.elevacao)).toEqual([])
  })

  it('a área de terra fica a 2% da v2', () => {
    const fracao = (fn: (x: number, y: number) => number) => {
      let n = 0
      let t = 0
      for (let j = 0; j < 56; j++) for (let i = 0; i < 80; i++) { t++; if (fn(((i + 0.5) / 80) * MAP_W, ((j + 0.5) / 56) * MAP_H) > 0) n++ }
      return n / t
    }
    expect(Math.abs(fracao(v3.elevacao) - fracao(v2.elevacao))).toBeLessThan(0.02)
  })

  it('não há ilhotas de ruído: só as ilhas declaradas por elipses pequenas existem', () => {
    const declaradas = BLOBS_V3.filter((b) => b.rx < 0.05 && b.ry < 0.05)
    for (const i of encontrarIlhotas(v3.elevacao)) {
      const perto = declaradas.some((b) => Math.hypot(i.x - b.cx, i.y - b.cy) < 0.04)
      expect(perto, `ilhota inesperada em (${i.x.toFixed(3)}, ${i.y.toFixed(3)})`).toBe(true)
    }
  })

  it('nenhuma partícula de terra com menos de 12 células (ruído do limiar)', () => {
    expect(encontrarIlhotas(v3.elevacao).filter((i) => i.celulas < 12)).toEqual([])
  })

  it('a baía a leste do Forte da Fenda não tem ilhotas', () => {
    const leste = encontrarIlhotas(v3.elevacao).filter((i) => i.x > 0.7 && i.x < 0.92 && i.y > 0.28 && i.y < 0.64)
    expect(leste).toEqual([])
  })
})
