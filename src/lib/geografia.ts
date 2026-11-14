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
  /** Optional rotation in radians, applied in pixel space (radii are then rx*W and ry*H px). */
  rot?: number
}

/** 'v1' = approved base shape. 'v2' = coastal-constraint refit. 'v3' = v2 with a smoothed east coast and a trimmed north inlet. */
export type GeoId = 'v1' | 'v2' | 'v3'

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

/**
 * Candidate v3 (preview with ?geo=3), refitted from v2. The horizontal ellipse top that gave a
 * ruler-straight shore east of the Forte da Fenda became a diagonal ellipse between the Forte and
 * the Enseada do Sino (two places), a local roughness (RUGOSIDADE) breaks the geometry, and the
 * northern sea inlet is trimmed to where the printed map ends it (PONTOS_V3). Fitted by
 * constraint search against places, control points and coastal chords.
 */
export const BLOBS_V3: Blob[] = [
  { cx: 0.6899, cy: 0.1612, rx: 0.1416, ry: 0.156, w: 1 },
  { cx: 0.7014, cy: 0.3249, rx: 0.1462, ry: 0.1714, w: 1 },
  { cx: 0.6548, cy: 0.6349, rx: 0.2139, ry: 0.1735, w: 1 },
  { cx: 0.8147, cy: 0.5406, rx: 0.0897, ry: 0.026, w: 1, rot: 0.8527 },
  { cx: 0.709, cy: 0.7572, rx: 0.1258, ry: 0.2067, w: 1 },
  { cx: 0.6472, cy: 0.8093, rx: 0.0906, ry: 0.1019, w: 1 },
  { cx: 0.473, cy: 0.4472, rx: 0.1037, ry: 0.1837, w: 1 },
  { cx: 0.2891, cy: 0.1998, rx: 0.2237, ry: 0.2465, w: 1 },
  { cx: 0.4121, cy: 0.2899, rx: 0.1141, ry: 0.0998, w: 1 },
  { cx: 0.359, cy: 0.5203, rx: 0.0906, ry: 0.0935, w: 1 },
  { cx: 0.2584, cy: 0.7177, rx: 0.2097, ry: 0.1966, w: 1 },
  { cx: 0.2218, cy: 0.9332, rx: 0.0498, ry: 0.0507, w: 0.95 },
  { cx: 0.1349, cy: 0.4686, rx: 0.0177, ry: 0.0304, w: 0.9 },
  { cx: 0.1659, cy: 0.3748, rx: 0.0204, ry: 0.023, w: 0.9 },
  { cx: 0.9411, cy: 0.6347, rx: 0.0167, ry: 0.0254, w: 0.9 },
  { cx: 0.9132, cy: 0.7567, rx: 0.012, ry: 0.0192, w: 0.9 },
  { cx: 0.5069, cy: 0.9458, rx: 0.0351, ry: 0.027, w: 0.9 },
  { cx: 0.538, cy: 0.264, rx: 0.0607, ry: 0.1216, w: 1 },
  { cx: 0.5302, cy: 0.2429, rx: 0.0354, ry: 0.0458, w: 1 },
  { cx: 0.5847, cy: 0.4338, rx: 0.038, ry: 0.0474, w: 1 },
  { cx: 0.4009, cy: 0.5594, rx: 0.0318, ry: 0.0315, w: 1 },
  { cx: 0.5123, cy: 0.1516, rx: 0.0257, ry: 0.0404, w: 1 },
]

export const GEOGRAFIAS: Record<GeoId, Blob[]> = { v1: BLOBS_V1, v2: BLOBS_V2, v3: BLOBS_V3 }

/** Local organic roughness: a gaussian patch that warps the domain and adds relief noise. */
export interface Rugosidade {
  cx: number
  cy: number
  r: number
  warp: number
  rug: number
}

export const RUGOSIDADE: Record<GeoId, Rugosidade[]> = { v1: [], v2: [], v3: [{ cx: 0.83, cy: 0.47, r: 0.12, warp: 0.019, rug: 0.06 }] }

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
  const rugs = RUGOSIDADE[geo]
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
    let wx = nx + 0.035 * n2(nx * 3.1, ny * 3.1)
    let wy = ny + 0.035 * n2(nx * 3.1 + 9, ny * 3.1 + 9)
    let extra = 0
    for (const g of rugs) {
      const ddx = nx - g.cx
      const ddy = (ny - g.cy) * 0.7
      const k = Math.exp(-(ddx * ddx + ddy * ddy) / (g.r * g.r))
      if (k < 0.01) continue
      wx += g.warp * k * n2(nx * 18 + 5, ny * 18)
      wy += g.warp * k * n2(nx * 18 + 11, ny * 18 + 4)
      extra += g.rug * k * n2(nx * 26 + 2, ny * 26 + 9)
    }
    let m = -1
    for (const b of blobs) {
      let dx: number
      let dy: number
      if (b.rot) {
        const px = (wx - b.cx) * W
        const py = (wy - b.cy) * H
        const c = Math.cos(b.rot)
        const sn = Math.sin(b.rot)
        dx = (px * c + py * sn) / (b.rx * W)
        dy = (-px * sn + py * c) / (b.ry * H)
      } else {
        dx = (wx - b.cx) / b.rx
        dy = (wy - b.cy) / b.ry
      }
      m = Math.max(m, (1 - (dx * dx + dy * dy)) * b.w)
    }
    return m + extra + 0.32 * fbm((x / W) * 7, (y / W) * 7) - 0.04
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

export interface PontosControle {
  readonly terra: readonly (readonly [number, number])[]
  readonly mar: readonly (readonly [number, number])[]
}

/**
 * v3 adds the northern sea inlet as printed (a "U" from the top edge that ends near y=.13)
 * and land just south of it, so the old tail that v2 left cannot come back.
 */
export const PONTOS_V3: PontosControle = {
  terra: [
    ...PONTOS_DE_CONTROLE.terra,
    [0.51, 0.17], // just south of the inlet's end
    [0.52, 0.2],
    [0.4, 0.08], // north-west land, west of the inlet
    [0.6, 0.09], // Terrasen's north-west, east of the inlet
  ],
  mar: [
    ...PONTOS_DE_CONTROLE.mar,
    [0.5, 0.03],
    [0.48, 0.07],
    [0.5, 0.11],
    [0.5, 0.12],
  ],
}

/**
 * Pairs of consecutive coastal places along the east coast. The shore between two of them
 * must stay near the straight line (chord) joining them: derived from the places alone.
 */
export const CORDAS_COSTEIRAS: readonly (readonly [string, string])[] = [
  ['suria', 'meah'],
  ['meah', 'rifthold'],
  ['rifthold', 'enseada-sino'],
  ['enseada-sino', 'banjali'],
]
/** Max distance (px) from any sampled point of a chord to the nearest shore. */
// 75px. Measured: the printed shore strays up to ~64px from the Meah-Forte chord; v3 peaks at 72px,
// v2 at 116px. Sampled every 5% along each chord.
export const CORDA_MAX_PX = 75

export interface Violacao {
  id: string
  motivo: string
}

/**
 * Checks the declared `geo` of every place against the generated terrain:
 * 'mar' is water, 'costa' is land hugging the shore, 'terra' is land inland.
 */
export function validarLugares(
  places: Place[],
  elevacao: Elevacao,
  W = MAP_W,
  H = MAP_H,
  controle: boolean | PontosControle = true,
  cordas: readonly (readonly [string, string])[] = [],
): Violacao[] {
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
  for (const [a, b] of cordas) {
    const pa = places.find((p) => p.id === a)
    const pb = places.find((p) => p.id === b)
    if (!pa || !pb) {
      out.push({ id: `corda(${a},${b})`, motivo: 'lugar da corda não existe' })
      continue
    }
    for (let t = 0.05; t <= 0.951; t += 0.05) {
      const x = (pa.x + (pb.x - pa.x) * t) * W
      const y = (pa.y + (pb.y - pa.y) * t) * H
      const d = distanciaCosta(elevacao, x, y, 200)
      if (d > CORDA_MAX_PX) out.push({ id: `corda(${a},${b})@${t.toFixed(2)}`, motivo: `a costa passa a ${d}px da reta entre os dois lugares` })
    }
  }
  if (controle === false) return out
  const pontos: PontosControle = controle === true ? PONTOS_DE_CONTROLE : controle
  for (const [nx, ny] of pontos.terra) {
    const x = nx * W
    const y = ny * H
    if (elevacao(x, y) <= 0) out.push({ id: `controle-terra(${nx},${ny})`, motivo: 'ponto de terra firme caiu na água' })
    else if (distanciaCosta(elevacao, x, y) < 25) out.push({ id: `controle-terra(${nx},${ny})`, motivo: 'ponto de terra firme colado na costa' })
  }
  for (const [nx, ny] of pontos.mar) {
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

export interface TrechoReto {
  eixo: 'col' | 'lin'
  /** Start of the straight window along the scan axis, px. */
  pos: number
  /** Largest deviation from the fitted straight line, px. */
  desvio: number
}

/**
 * Finds stretches of shore that are almost perfectly straight (what reads as "geometric").
 * It follows the first land-to-water transition along columns and along rows inside a
 * normalised region and fits a line to every `janela`-px window.
 */
export function trechosRetos(
  elevacao: Elevacao,
  regiao: { x0: number; x1: number; y0: number; y1: number },
  W = MAP_W,
  H = MAP_H,
  janela = 90,
  tolerancia = 3,
): TrechoReto[] {
  const passo = 6
  const x0 = regiao.x0 * W
  const x1 = regiao.x1 * W
  const y0 = regiao.y0 * H
  const y1 = regiao.y1 * H
  const colunas: (number | null)[] = []
  for (let x = x0; x <= x1; x += passo) {
    let v: number | null = null
    if (elevacao(x, y0) > 0) {
      for (let y = y0; y <= y1; y += 3) {
        if (elevacao(x, y) <= 0) {
          v = y
          break
        }
      }
    }
    colunas.push(v)
  }
  const linhas: (number | null)[] = []
  for (let y = y0; y <= y1; y += passo) {
    let v: number | null = null
    if (elevacao(x0, y) > 0) {
      for (let x = x0; x <= x1; x += 3) {
        if (elevacao(x, y) <= 0) {
          v = x
          break
        }
      }
    }
    linhas.push(v)
  }
  const out: TrechoReto[] = []
  const n = Math.round(janela / passo)
  const analisar = (vals: (number | null)[], eixo: 'col' | 'lin', origem: number) => {
    for (let i = 0; i + n <= vals.length; i++) {
      const w = vals.slice(i, i + n)
      if (w.some((v) => v === null)) continue
      const ys = w as number[]
      const mx = (n - 1) / 2
      const my = ys.reduce((a, b) => a + b, 0) / n
      let sxy = 0
      let sxx = 0
      for (let k = 0; k < n; k++) {
        sxy += (k - mx) * (ys[k]! - my)
        sxx += (k - mx) ** 2
      }
      const b = sxy / sxx
      const desvio = Math.max(...ys.map((v, k) => Math.abs(v - (my + b * (k - mx)))))
      if (desvio < tolerancia) out.push({ eixo, pos: origem + i * passo, desvio })
    }
  }
  analisar(colunas, 'col', x0)
  analisar(linhas, 'lin', y0)
  return out
}

export interface Ilhota {
  x: number
  y: number
  celulas: number
}

/**
 * Small separate land masses (flood fill over land). Islands that the printed map has are
 * declared by blobs on purpose; anything else small and isolated is a noise artefact.
 */
export function encontrarIlhotas(elevacao: Elevacao, W = MAP_W, H = MAP_H, passo = 6, maxCelulas = 400): Ilhota[] {
  const gw = Math.ceil(W / passo)
  const gh = Math.ceil(H / passo)
  const terra = new Uint8Array(gw * gh)
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) terra[j * gw + i] = elevacao(i * passo, j * passo) > 0 ? 1 : 0
  const visto = new Uint8Array(gw * gh)
  const out: Ilhota[] = []
  for (let s = 0; s < gw * gh; s++) {
    if (!terra[s] || visto[s]) continue
    const fila = [s]
    visto[s] = 1
    let sx = 0
    let sy = 0
    for (let q = 0; q < fila.length; q++) {
      const c = fila[q]!
      const x = c % gw
      const y = (c / gw) | 0
      sx += x
      sy += y
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const k = ny * gw + nx
        if (terra[k] && !visto[k]) {
          visto[k] = 1
          fila.push(k)
        }
      }
    }
    if (fila.length <= maxCelulas) out.push({ x: ((sx / fila.length) * passo) / W, y: ((sy / fila.length) * passo) / H, celulas: fila.length })
  }
  return out
}
