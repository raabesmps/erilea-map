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

/**
 * Candidate shape (preview with ?geo=2). Starts from v1, adds a filler for the inner bay that
 * v1 invented (the printed map has land there) and is refitted by constraint search so every
 * place and every control point (PONTOS_DE_CONTROLE) agrees with the coast (see geografia.test.ts). Land area stays within 1% of v1.
 */
export const BLOBS_V2: Blob[] = [
  { cx: 0.6981, cy: 0.1405, rx: 0.1422, ry: 0.1368, w: 1 },
  { cx: 0.712, cy: 0.3437, rx: 0.1465, ry: 0.1727, w: 1 },
  { cx: 0.6531, cy: 0.6276, rx: 0.2129, ry: 0.1653, w: 1 },
  { cx: 0.797, cy: 0.5644, rx: 0.0846, ry: 0.0505, w: 1 },
  { cx: 0.712, cy: 0.7627, rx: 0.1348, ry: 0.1959, w: 1 },
  { cx: 0.6537, cy: 0.8301, rx: 0.1074, ry: 0.0952, w: 1 },
  { cx: 0.4783, cy: 0.4365, rx: 0.1088, ry: 0.1712, w: 1 },
  { cx: 0.2815, cy: 0.1913, rx: 0.2327, ry: 0.2388, w: 1 },
  { cx: 0.3965, cy: 0.3035, rx: 0.1087, ry: 0.0956, w: 1 },
  { cx: 0.3653, cy: 0.5291, rx: 0.0817, ry: 0.0898, w: 1 },
  { cx: 0.2489, cy: 0.7194, rx: 0.2023, ry: 0.195, w: 1 },
  { cx: 0.242, cy: 0.9158, rx: 0.0493, ry: 0.0517, w: 0.95 },
  { cx: 0.1479, cy: 0.4846, rx: 0.0188, ry: 0.04, w: 0.9 },
  { cx: 0.1836, cy: 0.3948, rx: 0.0196, ry: 0.0258, w: 0.9 },
  { cx: 0.9503, cy: 0.6332, rx: 0.0167, ry: 0.0249, w: 0.9 },
  { cx: 0.9465, cy: 0.7281, rx: 0.012, ry: 0.0198, w: 0.9 },
  { cx: 0.4956, cy: 0.9119, rx: 0.0382, ry: 0.0293, w: 0.9 },
  { cx: 0.561, cy: 0.2722, rx: 0.0563, ry: 0.1186, w: 1 },
  // small fillers that close enclosed water left by the fit (detected by encontrarLagos)
  { cx: 0.526, cy: 0.246, rx: 0.034, ry: 0.05, w: 1 },
  { cx: 0.583, cy: 0.437, rx: 0.038, ry: 0.05, w: 1 },
  { cx: 0.438, cy: 0.619, rx: 0.028, ry: 0.034, w: 1 },
]

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

/**
 * Extra anchor points read from the printed map (labels that sit on land or in water),
 * so the coast also agrees with the map where no place pin exists. Normalised coordinates.
 */
export const PONTOS_DE_CONTROLE = {
  terra: [
    [0.34, 0.29], // "Os Desertos do Oeste" label, west end
    [0.4, 0.33],
    [0.45, 0.37],
    [0.49, 0.41], // ... east end
    [0.57, 0.37], // "Montanhas Ruhnn" label path
    [0.59, 0.33],
    [0.63, 0.4], // "O Desfiladeiro de Ferro"
    [0.555, 0.43],
    [0.55, 0.38],
  ],
  mar: [
    [0.113, 0.426], // "Erilea" title sits on the western sea
    [0.2, 0.445],
    [0.5, 0.07], // northern inlet between the north-west land and Terrasen
    [0.47, 0.11],
  ],
} as const

export interface Violacao {
  id: string
  motivo: string
}

/**
 * Checks the declared `geo` of every place against the generated terrain:
 * 'mar' is water, 'costa' is land hugging the shore, 'terra' is land inland.
 */
export function validarLugares(places: Place[], elevacao: Elevacao, W = MAP_W, H = MAP_H, comControle = true): Violacao[] {
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
  if (!comControle) return out
  for (const [nx, ny] of PONTOS_DE_CONTROLE.terra) {
    const x = nx * W
    const y = ny * H
    if (elevacao(x, y) <= 0) out.push({ id: `controle-terra(${nx},${ny})`, motivo: 'ponto de terra firme caiu na água' })
    else if (distanciaCosta(elevacao, x, y) < 25) out.push({ id: `controle-terra(${nx},${ny})`, motivo: 'ponto de terra firme colado na costa' })
  }
  for (const [nx, ny] of PONTOS_DE_CONTROLE.mar) {
    if (elevacao(nx * W, ny * H) > 0) out.push({ id: `controle-mar(${nx},${ny})`, motivo: 'ponto de mar caiu em terra' })
  }
  return out
}

export interface Lago {
  /** Centre of the enclosed water, normalised. */
  x: number
  y: number
  /** Area in grid cells (8px). */
  celulas: number
}

/**
 * Water that does not connect to the open sea (flood fill from the map border).
 * The printed map's lakes are not modelled, so any enclosed water is an artefact.
 */
export function encontrarLagos(elevacao: Elevacao, W = MAP_W, H = MAP_H, passo = 8): Lago[] {
  const gw = Math.ceil(W / passo)
  const gh = Math.ceil(H / passo)
  const agua = new Uint8Array(gw * gh)
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) agua[j * gw + i] = elevacao(i * passo, j * passo) <= 0 ? 1 : 0
  const comp = new Int32Array(gw * gh).fill(-1)
  const lagos: Lago[] = []
  let id = 0
  for (let s = 0; s < gw * gh; s++) {
    if (!agua[s] || comp[s] !== -1) continue
    const fila = [s]
    comp[s] = id
    let toca = false
    let n = 0
    let sx = 0
    let sy = 0
    for (let q = 0; q < fila.length; q++) {
      const c = fila[q]!
      const x = c % gw
      const y = (c / gw) | 0
      n++
      sx += x
      sy += y
      if (x === 0 || y === 0 || x === gw - 1 || y === gh - 1) toca = true
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const k = ny * gw + nx
        if (agua[k] && comp[k] === -1) {
          comp[k] = id
          fila.push(k)
        }
      }
    }
    if (!toca) lagos.push({ x: ((sx / n) * passo) / W, y: ((sy / n) * passo) / H, celulas: n })
    id++
  }
  return lagos
}
