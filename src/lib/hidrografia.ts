import hidrografiaJson from '../data/hidrografia.json'
import { MAP_H, MAP_W } from './geografia'

/**
 * Lakes and rivers read from the printed map. Pure geometry (no canvas) so it can be tested:
 * the renderer draws what this module says is active, and the glyph planner uses `Obstaculos`
 * to keep mountains and trees off the water.
 */

export type Confianca = 'alta' | 'media' | 'baixa'
/** Highest confidence tier that is drawn. 'alta' = only the clearest elements. */
export type NivelHidro = 'alta' | 'media'

export type Foz =
  | { tipo: 'mar' }
  | { tipo: 'lago'; com: string }
  | { tipo: 'juncao'; com: string }
  /** The printed line itself stops here: the print shows neither sea nor lake. */
  | { tipo: 'fim-no-impresso'; ref: string }

export interface LagoDef {
  id: string
  centro: [number, number]
  /** Semi-axes in px at the 2400 px reference width. */
  semi_px: [number, number]
  rot: number
  confianca: Confianca
  nome: null
  ref?: string
  pendente?: boolean
  motivo?: string
}

export interface RioDef {
  id: string
  pontos: [number, number][]
  nascente: string
  foz: Foz
  confianca: Confianca
  nome: null
  ref?: string
  /** Id of a generated river (biomas.json) this one replaces once active. */
  substitui?: string
  /** The river is only drawn if this river id is also active. */
  depende_de?: string
}

export interface Candidato {
  id: string
  status: 'aguardando-decisao'
  item_plano: number
  confianca: Confianca
  origem: string
  destino: string
  pontos: [number, number][]
}

export interface Hidrografia {
  lagos: LagoDef[]
  pendentes: LagoDef[]
  rios: RioDef[]
  candidatos: Candidato[]
}

export const HIDROGRAFIA = hidrografiaJson as unknown as Hidrografia

const ORDEM: Record<Confianca, number> = { alta: 0, media: 1, baixa: 2 }
export const permite = (c: Confianca, nivel: NivelHidro) => ORDEM[c] <= ORDEM[nivel]

export interface HidroAtiva {
  lagos: LagoDef[]
  rios: RioDef[]
  /** Generated rivers (biomas.json) that an active river replaces. */
  substituidos: Set<string>
}

/** What is actually drawn at a given tier. Pending lakes and candidates are never active. */
export function ativos(nivel: NivelHidro, h: Hidrografia = HIDROGRAFIA): HidroAtiva {
  const lagos = h.lagos.filter((l) => !l.pendente && permite(l.confianca, nivel))
  const doNivel = h.rios.filter((r) => permite(r.confianca, nivel))
  // a dependency must itself be an active river; candidates never count
  const rios = doNivel.filter((r) => !r.depende_de || doNivel.some((o) => o.id === r.depende_de))
  const substituidos = new Set(rios.flatMap((r) => (r.substitui ? [r.substitui] : [])))
  return { lagos, rios, substituidos }
}

function hash(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Organic closed outline of a lake (pixel coordinates), deterministic per id. */
export function lagoPoligono(l: LagoDef, W = MAP_W, H = MAP_H, n = 72): [number, number][] {
  const k = W / 2400
  const [a, b] = [l.semi_px[0] * k, l.semi_px[1] * k]
  const h = hash(l.id)
  const f1 = ((h & 255) / 255) * Math.PI * 2
  const f2 = (((h >> 8) & 255) / 255) * Math.PI * 2
  const f3 = (((h >> 16) & 255) / 255) * Math.PI * 2
  const c = Math.cos(l.rot)
  const s = Math.sin(l.rot)
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2
    const r = 1 + 0.09 * Math.sin(2 * t + f1) + 0.06 * Math.sin(3 * t + f2) + 0.035 * Math.sin(5 * t + f3)
    const lx = a * r * Math.cos(t)
    const ly = b * r * Math.sin(t)
    out.push([l.centro[0] * W + lx * c - ly * s, l.centro[1] * H + lx * s + ly * c])
  }
  return out
}

/** Catmull-Rom spline through the waypoints, sampled about every `step` px. */
export function catmullRom(p: { x: number; y: number }[], step: number) {
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)]!
    const p1 = p[i]!
    const p2 = p[i + 1]!
    const p3 = p[Math.min(p.length - 1, i + 2)]!
    const n = Math.max(2, Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step))
    for (let k = 0; k < n; k++) {
      const t = k / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  out.push(p[p.length - 1]!)
  return out
}

/** Smoothed river course in pixel coordinates (waypoints are never extended past the print). */
export function rioPontos(r: RioDef, W = MAP_W, H = MAP_H, at?: (x: number, y: number) => number): { x: number; y: number }[] {
  const way = r.pontos.map(([x, y]) => ({ x: x * W, y: y * H }))
  const pts = catmullRom(way, 6)
  if (r.foz.tipo === 'mar' && at) {
    // run on to the sea along the last heading, like the Avery
    const a = pts[pts.length - 2]!
    const b = pts[pts.length - 1]!
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    let { x, y } = b
    for (let n = 0; n < 160 && at(Math.round(x), Math.round(y)) > 0; n++) {
      x += ((b.x - a.x) / len) * 6
      y += ((b.y - a.y) / len) * 6
      pts.push({ x, y })
    }
  }
  return pts
}

function distSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function dentroDoPoligono(x: number, y: number, poly: [number, number][]): boolean {
  let dentro = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

/** Distance (px) from a point to a polygon: 0 inside, otherwise to the nearest edge. */
export function distanciaAoPoligono(x: number, y: number, poly: [number, number][]): number {
  if (dentroDoPoligono(x, y, poly)) return 0
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) best = Math.min(best, distSeg(x, y, poly[j]![0], poly[j]![1], poly[i]![0], poly[i]![1]))
  return best
}

export function distanciaAoCurso(x: number, y: number, pts: { x: number; y: number }[]): number {
  let best = Infinity
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distSeg(x, y, pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y))
  return best
}

/** Water that glyphs (mountains, trees) must stay off. */
export interface Obstaculos {
  perto(x: number, y: number, margem?: number): boolean
}

export function criarObstaculos(lagos: [number, number][][], rios: { x: number; y: number }[][]): Obstaculos {
  // coarse bounding boxes make the per-glyph test cheap
  const caixasLago = lagos.map((p) => {
    const xs = p.map((q) => q[0])
    const ys = p.map((q) => q[1])
    return { p, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  const caixasRio = rios.map((pts) => {
    const xs = pts.map((q) => q.x)
    const ys = pts.map((q) => q.y)
    return { pts, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
  })
  return {
    perto(x, y, margem = 10) {
      for (const c of caixasLago) {
        if (x < c.x0 - margem || x > c.x1 + margem || y < c.y0 - margem || y > c.y1 + margem) continue
        if (distanciaAoPoligono(x, y, c.p) <= margem) return true
      }
      for (const c of caixasRio) {
        if (x < c.x0 - margem || x > c.x1 + margem || y < c.y0 - margem || y > c.y1 + margem) continue
        if (distanciaAoCurso(x, y, c.pts) <= margem) return true
      }
      return false
    },
  }
}
