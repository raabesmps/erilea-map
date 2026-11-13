import { createNoise2D } from 'simplex-noise'
import type { Place } from '../types'

/**
 * Geography of the generated continent, kept free of any canvas/DOM code so it
 * can be unit-tested. The renderer samples `elevacao`; the validator checks that
 * every place agrees with the coastline (see validarLugares).
 */

export const MAP_W = 2400
export const MAP_H = 1680

export interface Blob {
  cx: number
  cy: number
  rx: number
  ry: number
  w: number
}

/** 'v1' = approved base shape. 'v2' = candidate refit to the coastal constraints. */
export type GeoId = 'v1' | 'v2'

// Own interpretation of the geography. Place *positions* follow the book's map;
// the coastline itself is generated, not traced (normalised coordinates).
export const BLOBS_V1: Blob[] = [
  { cx: 0.70, cy: 0.14, rx: 0.17, ry: 0.13, w: 1 }, // Terrasen
  { cx: 0.74, cy: 0.40, rx: 0.16, ry: 0.20, w: 1 }, // Adarlan
  { cx: 0.65, cy: 0.60, rx: 0.22, ry: 0.16, w: 1 }, // centre / Melisande
  { cx: 0.82, cy: 0.58, rx: 0.09, ry: 0.07, w: 1 }, // east bulge
  { cx: 0.76, cy: 0.78, rx: 0.18, ry: 0.19, w: 1 }, // Eyllwe
  { cx: 0.66, cy: 0.86, rx: 0.10, ry: 0.10, w: 1 }, // south-west marsh
  { cx: 0.47, cy: 0.45, rx: 0.10, ry: 0.18, w: 1 }, // land bridge
  { cx: 0.30, cy: 0.20, rx: 0.20, ry: 0.20, w: 1 }, // north-west land
  { cx: 0.40, cy: 0.36, rx: 0.12, ry: 0.10, w: 1 }, // its south-east shoulder
  { cx: 0.36, cy: 0.55, rx: 0.09, ry: 0.08, w: 1 }, // link to the Bogdano forest
  { cx: 0.25, cy: 0.72, rx: 0.17, ry: 0.24, w: 1 }, // desert peninsula
  { cx: 0.20, cy: 0.90, rx: 0.05, ry: 0.05, w: 0.95 }, // its southern tail
  { cx: 0.15, cy: 0.50, rx: 0.02, ry: 0.04, w: 0.9 }, // western islets
  { cx: 0.19, cy: 0.45, rx: 0.02, ry: 0.025, w: 0.9 },
  { cx: 0.93, cy: 0.64, rx: 0.015, ry: 0.025, w: 0.9 }, // Dead Islands
  { cx: 0.95, cy: 0.74, rx: 0.012, ry: 0.02, w: 0.9 },
  { cx: 0.5, cy: 0.93, rx: 0.04, ry: 0.03, w: 0.9 },
]

/** The candidate starts as a copy of v1 and is refitted in a later step. */
export const BLOBS_V2: Blob[] = BLOBS_V1.map((b) => ({ ...b }))

export const GEOGRAFIAS: Record<GeoId, Blob[]> = { v1: BLOBS_V1, v2: BLOBS_V2 }

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Elevacao = (x: number, y: number) => number

/**
 * Builds the elevation function (pixel coordinates). It consumes `rnd` exactly
 * like the original renderer did, so the generated map does not change.
 */
export function criarGeografia(rnd: () => number, W = MAP_W, H = MAP_H, geo: GeoId = 'v1') {
  const blobs = GEOGRAFIAS[geo]
  const n1 = createNoise2D(rnd)
  const n2 = createNoise2D(rnd)
  const fbm = (x: number, y: number) => {
    let a = 1
    let f = 1
    let s = 0
    let t = 0
    for (let i = 0; i < 5; i++) {
      s += a * n1(x * f, y * f)
      t += a
      a *= 0.5
      f *= 2
    }
    return s / t
  }
  const elevacao: Elevacao = (x, y) => {
    const nx = x / W
    const ny = y / H
    const wx = nx + 0.035 * n2(nx * 3.1, ny * 3.1)
    const wy = ny + 0.035 * n2(nx * 3.1 + 9, ny * 3.1 + 9)
    let m = -1
    for (const b of blobs) {
      const dx = (wx - b.cx) / b.rx
      const dy = (wy - b.cy) / b.ry
      m = Math.max(m, (1 - (dx * dx + dy * dy)) * b.w)
    }
    return m + 0.32 * fbm((x / W) * 7, (y / W) * 7) - 0.04
  }
  return { elevacao, ruido: n2 }
}

/** Shortest distance (px) from a point to a cell of the opposite kind (land vs water). */
export function distanciaCosta(elevacao: Elevacao, x: number, y: number, max = 400): number {
  const aqui = elevacao(x, y) > 0
  let best = Infinity
  for (let k = 0; k < 24; k++) {
    const a = (k * Math.PI) / 12
    for (let d = 4; d <= max && d < best; d += 4) {
      if (elevacao(x + Math.cos(a) * d, y + Math.sin(a) * d) > 0 !== aqui) {
        best = d
        break
      }
    }
  }
  return best
}

/** A coastal place must sit on land within this many px of the shore. */
export const COSTA_MAX_PX = 50
/** An inland place must be at least this many px away from any shore. */
export const TERRA_MIN_PX = 40

export interface Violacao {
  id: string
  motivo: string
}

/**
 * Checks the declared `geo` of every place against the generated terrain:
 * 'mar' is water, 'costa' is land hugging the shore, 'terra' is land inland.
 */
export function validarLugares(places: Place[], elevacao: Elevacao, W = MAP_W, H = MAP_H): Violacao[] {
  const out: Violacao[] = []
  for (const p of places) {
    const x = p.x * W
    const y = p.y * H
    const terra = elevacao(x, y) > 0
    if (p.geo === 'mar') {
      if (terra) out.push({ id: p.id, motivo: 'deveria estar na água' })
      continue
    }
    if (!terra) {
      out.push({ id: p.id, motivo: 'está na água' })
      continue
    }
    const d = distanciaCosta(elevacao, x, y)
    if (p.geo === 'costa' && d > COSTA_MAX_PX) out.push({ id: p.id, motivo: `costeiro, mas a ${d}px da costa` })
    if (p.geo === 'terra' && d < TERRA_MIN_PX) out.push({ id: p.id, motivo: `interior, mas a ${d}px da costa` })
  }
  return out
}
