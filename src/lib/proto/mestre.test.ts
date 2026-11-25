/**
 * R1 (master, no browser): the Terrasen plan must stay bit-identical. It is computed exactly the way the app does it
 * (same obstacles, same palette, same field), and compared with tests/navegador/mestre.json, the single source of truth
 * that the browser suite also checks. The seed-11 value is the approved reference; the other seeds are STRESS seeds
 * (none of the seeds 1 to 400 other than 11 passes the geography validators), used only to catch hidden seed-11 dependence.
 */
import { describe, expect, it } from 'vitest'
import biomas from '../../data/biomas.json'
import lugaresJson from '../../data/lugares.json'
import mestre from '../../../tests/navegador/mestre.json'
import { CORDAS_COSTEIRAS, criarGeografia, mulberry32, MAP_H, MAP_W, PONTOS_V3, validarLugares } from '../geografia'
import { buildField, planoProto, tracarRios } from '../colorir'
import { ativos, criarObstaculos, lagoPoligono, rioPontos } from '../hidrografia'
import { aplicarPaleta } from './terrasen'
import type { Place } from '../../types'

const fnv = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619) >>> 0
  }
  return x.toString(16)
}

/** The Terrasen plan exactly as renderTerrain computes it for a seed. */
function planoDe(seed: number) {
  const { elevacao, ruido } = criarGeografia(mulberry32(seed), MAP_W, MAP_H, 'v3')
  const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
  const hidro = ativos('alta')
  const lagos = hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H))
  const rios = [...tracarRios({ W: MAP_W, H: MAP_H, at, noise: ruido }, hidro.substituidos).map((r) => r.pts), ...hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))]
  const obst = criarObstaculos(lagos, rios)
  const zonas = aplicarPaleta(biomas.zonas as never[]) as never[]
  const campo = buildField(MAP_W, MAP_H, ruido, zonas)
  const { plano } = planoProto({ W: MAP_W, H: MAP_H, at, noise: ruido, proto: { estilo: 'A', estiloSepia: 'B' } }, campo, zonas, obst)
  const lista = plano.glifos.map((g) => [g.tipo, +g.x.toFixed(1), +g.y.toFixed(1), +g.tam.toFixed(2), g.neve ? 1 : 0, +g.rot.toFixed(3), +g.v.toFixed(3), g.origem])
  return { n: plano.glifos.length, hash: fnv(JSON.stringify(lista)) }
}

const casos = mestre.casos as Record<string, { plano?: { n: number; hash: string } }>

describe('valores mestre do plano de Terrasen', () => {
  it('semente 11 (referência aprovada): 151 símbolos e o hash registrado', () => {
    expect(planoDe(11)).toEqual(casos['11|colorido|raster']!.plano)
    expect(planoDe(11)).toEqual({ n: 151, hash: '8a7cb845' })
  })

  it('a semente 11 é a única com geografia válida; as de estresse não são mapas aprovados', () => {
    const { elevacao } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
    expect(validarLugares(lugaresJson as Place[], elevacao, MAP_W, MAP_H, PONTOS_V3, CORDAS_COSTEIRAS)).toEqual([])
    const { elevacao: outra } = criarGeografia(mulberry32(184), MAP_W, MAP_H, 'v3')
    expect(validarLugares(lugaresJson as Place[], outra, MAP_W, MAP_H, PONTOS_V3, CORDAS_COSTEIRAS).length).toBeGreaterThan(0)
  })

  for (const seed of [184, 21, 37]) {
    it(`semente de estresse ${seed}: o plano é o registrado (e determinístico)`, () => {
      const a = planoDe(seed)
      expect(a).toEqual(casos[`${seed}|colorido|raster`]!.plano)
      expect(planoDe(seed)).toEqual(a)
    })
  }

  it('o plano depende da semente (as sementes de estresse não repetem o plano da 11)', () => {
    const hashes = new Set([11, 184, 21, 37].map((s) => casos[`${s}|colorido|raster`]!.plano!.hash))
    expect(hashes.size).toBe(4)
  })
})
