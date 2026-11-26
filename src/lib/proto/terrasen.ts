import lugaresJson from '../../data/lugares.json'
import type { Place } from '../../types'
import { distanciaAoCurso, type Obstaculos } from '../hidrografia'
import arteJson from '../../data/terrasen-arte.json'
import rotasJson from '../../data/rotas.json'
import type { Route } from '../../types'
import type { ModoDesenho } from '../biomas/tipos'
import { PALETA_TERRASEN } from './terrasen-paleta'
import { registrarGlifosTerrasen } from './terrasen-glifos'

/**
 * PROTOTYPE (branch bioma-terrasen, off by default: ?terrasen=A|B|C).
 * Visual proposal for the pilot region. It only touches the Terrasen zones (ids "r03-*"): palette,
 * forest masses, clearings, ridge-aligned mountains and three symbol styles. Nothing here is
 * merged or final; the geography, rivers, lakes, pins and routes are never moved.
 */

export type EstiloTerrasen = 'A' | 'B' | 'C'
export interface ProtoTerrasen {
  /** Symbol style used in the colour map. */
  estilo: EstiloTerrasen
  /** Symbol style used in the sepia map (defaults to `estilo`). */
  estiloSepia?: EstiloTerrasen
  ajuste?: Partial<AjusteTerrasen>
  /** EXPERIMENTAL vector layer: the raster leaves the Terrasen symbols out (washes stay) and `aoPlanejar` receives the plan. */
  vetorial?: boolean
  aoPlanejar?: (plano: PlanoTerrasen) => void
}

/** ?terrasen=AB means style A in colour and style B in sepia (the author's choice). */
export type VariacaoTerrasen = EstiloTerrasen | 'AB'
export const protoDe = (v: VariacaoTerrasen): ProtoTerrasen => (v === 'AB' ? { estilo: 'A', estiloSepia: 'B' } : { estilo: v })

// the palette lives in terrasen-paleta.ts; re-exported so the Terrasen module keeps its public surface
export { PALETA_TERRASEN, aplicarPaleta } from './terrasen-paleta'

// Terrasen's symbol types must be in the glyph registry before anything draws them
registrarGlifosTerrasen()

export const ZONAS_TERRASEN = (id: string) => id.startsWith('r03-')
export const ZONA_MONTANHAS = 'r03-montanhas-norte'

const sm = (a: number, b: number, t: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** Deterministic hash in [0,1): the prototype never touches the shared random stream. */
export function h2(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Feathered share (0..1) of the surroundings that belong to the chosen zones. */
export function criarPeso(
  field: { best: Uint8Array; LW: number },
  zonas: { id: string }[],
  pertence: (id: string) => boolean,
  S = 4,
): (x: number, y: number) => number {
  const LH = field.best.length / field.LW
  const em = (x: number, y: number) => {
    const cx = (x / S) | 0
    const cy = (y / S) | 0
    if (x < 0 || y < 0 || cx >= field.LW || cy >= LH) return 0
    const bi = field.best[cy * field.LW + cx]!
    return bi !== 255 && pertence(zonas[bi]!.id) ? 1 : 0
  }
  return (x, y) => {
    let s = em(x, y) * 2
    let n = 2
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      s += em(x + Math.cos(a) * 24, y + Math.sin(a) * 24)
      s += em(x + Math.cos(a) * 48, y + Math.sin(a) * 48) * 0.7
      n += 1.7
    }
    return s / n
  }
}

export interface Cumeeira {
  id: string
  ref: string
  pontos: [number, number][]
  largura: number
  forca: number
  neve: boolean
  /** Round 3: overall size factor (<1 lightens a heavy ridge) and an absolute cap on the tallest peak (px). */
  escala?: number
  tamMax?: number
}

export interface Nucleo {
  id: string
  ref: string
  x: number
  y: number
  rx: number
  ry: number
  rot: number
  forca: number
}

/**
 * ARTISTIC limits (not geography): where ridges and forest cores are drawn. They live in
 * terrasen-arte.json, read from the printed map, and can change without touching the approved
 * coast, rivers, lakes, places or routes.
 */
export const ARTE = arteJson as unknown as { cumeeiras: Cumeeira[]; nucleos: Nucleo[]; lavagem: { clareira: number; massa: number } }

/** Tunables of the planner (the probe sweeps them; the defaults are the proposal). */
export interface AjusteTerrasen {
  tamConifBase: number
  tamConifVar: number
  rConifBase: number
  rConifVar: number
  pExp: number
  lavagemClareira: number
  lavagemMassa: number
  /** Clearance (px) from lakes and rivers, added to the glyph half-size. */
  margemAgua: number
  /** Clearance (px) from the journey routes. */
  margemRota: number
  /** Clearance (px) around place icons (labels get their own rectangle). */
  folgaIcone: number
  /** Mean spacing (px) between mountains along a ridge. */
  passoCume: number
  bosquesProb: number
  clareiraMin: number
}

export const AJUSTE_PADRAO: AjusteTerrasen = {
  tamConifBase: 6.5,
  tamConifVar: 5.5,
  rConifBase: 11.5,
  rConifVar: 21,
  pExp: 0.85,
  lavagemClareira: ARTE.lavagem.clareira,
  lavagemMassa: ARTE.lavagem.massa,
  margemAgua: 14,
  margemRota: 13,
  folgaIcone: 30,
  passoCume: 21,
  bosquesProb: 0.38,
  clareiraMin: 62,
}

export interface GlifoT {
  x: number
  y: number
  tipo: 'conifera' | 'montanha' | 'colina'
  tam: number
  neve: boolean
  rot: number
  v: number
  /** Where the planner put it, for diagnostics. */
  origem: 'nucleo' | 'bosque' | 'cume' | 'sope'
}

export interface Clareira {
  x: number
  y: number
  rx: number
  ry: number
  rot: number
}

export interface PlanoTerrasen {
  glifos: GlifoT[]
  clareiras: Clareira[]
  massas: { x: number; y: number; r: number; a: number }[]
}

export interface EntradaPlano {
  W: number
  H: number
  at: (x: number, y: number) => number
  noise: (x: number, y: number) => number
  pesoT: (x: number, y: number) => number
  pesoMont: (x: number, y: number) => number
  obst?: Obstaculos
  ajuste?: Partial<AjusteTerrasen>
}

const PINS = (lugaresJson as Place[]).map((p) => ({ x: p.x, y: p.y }))
const ROTAS = (rotasJson as Route[]).map((r) => r.pontos)

/** Forest-core density (0..1): intentional cores with a warped, fractal fringe. */
export function nucleoValor(x: number, y: number, noise: (x: number, y: number) => number, W: number, H: number): number {
  const wx = x + 34 * noise(x / 90 + 3, y / 90)
  const wy = y + 34 * noise(x / 90 + 9, y / 90 + 4)
  let base = 0
  for (const n of ARTE.nucleos) {
    const dx = wx - n.x * W
    const dy = wy - n.y * H
    const c = Math.cos(n.rot)
    const sn = Math.sin(n.rot)
    const u = (dx * c + dy * sn) / (n.rx * W)
    const v = (-dx * sn + dy * c) / (n.ry * H)
    base = Math.max(base, n.forca * Math.exp(-(u * u + v * v) * 1.1))
  }
  const borda = 0.2 * noise(x / 44 + 1, y / 44 + 2) + 0.1 * noise(x / 19 + 5, y / 19 + 1)
  return sm(0.28, 0.72, base + borda)
}

function dentroClareira(x: number, y: number, c: Clareira): number {
  const dx = x - c.x
  const dy = y - c.y
  const cs = Math.cos(c.rot)
  const sn = Math.sin(c.rot)
  const u = (dx * cs + dy * sn) / c.rx
  const v = (-dx * sn + dy * cs) / c.ry
  return 1 - sm(0.75, 1.15, Math.sqrt(u * u + v * v))
}

/**
 * Plans forest masses, intentional clearings, ridge-aligned mountains and small groves.
 * Positions of ridges and cores come from terrasen-arte.json (artistic, from the printed map).
 * Only inside Terrasen, on land, and clear of water, routes, place icons and their labels.
 */
export function planejarTerrasen(e: EntradaPlano): PlanoTerrasen {
  const { W, H, at, noise, pesoT, obst } = e
  const A = { ...AJUSTE_PADRAO, ...e.ajuste }
  const pinsPx = PINS.map((p) => ({ x: p.x * W, y: p.y * H }))
  const rotasPx = ROTAS.map((r) => r.map(([x, y]) => ({ x: x * W, y: y * H })))
  const CELL = 40
  const grade = new Map<number, { x: number; y: number; r: number }[]>()
  const chave = (cx: number, cy: number) => cx * 4096 + cy
  const livre = (x: number, y: number, r: number) => {
    const cx = (x / CELL) | 0
    const cy = (y / CELL) | 0
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const lista = grade.get(chave(cx + i, cy + j))
        if (!lista) continue
        for (const o of lista) if (Math.hypot(o.x - x, o.y - y) < 0.5 * (r + o.r) * 0.95) return false
      }
    }
    return true
  }
  const glifos: GlifoT[] = []
  /** Common acceptance: land, Terrasen, icons+labels, water, routes, spacing. */
  const tentar = (g: GlifoT, r: number, margem: number): boolean => {
    const { x, y } = g
    if (x < 8 || y < 8 || x > W - 8) return false
    if (at(Math.round(x), Math.round(y)) < 0.08) return false
    if (pesoT(x, y) < 0.12) return false
    for (const p of pinsPx) {
      if (Math.hypot(p.x - x, p.y - y) < A.folgaIcone) return false
      // the label sits right under the icon
      if (Math.abs(x - p.x) < 52 && y > p.y + 6 && y < p.y + 38) return false
    }
    if (obst?.perto(x, y, margem + g.tam * 0.8)) return false
    for (const rota of rotasPx) if (distanciaAoCurso(x, y, rota) < A.margemRota + g.tam * 0.3) return false
    if (!livre(x, y, r)) return false
    const k = chave((x / CELL) | 0, (y / CELL) | 0)
    const lista = grade.get(k) ?? []
    lista.push({ x, y, r })
    grade.set(k, lista)
    glifos.push(g)
    return true
  }

  // ---- 1. mountains along the ridges read from the printed map ----
  for (const [ri, cume] of ARTE.cumeeiras.entries()) {
    const pts = cume.pontos.map(([x, y]) => ({ x: x * W, y: y * H }))
    const seg: number[] = []
    let L = 0
    for (let i = 1; i < pts.length; i++) {
      seg.push(Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y))
      L += seg[i - 1]!
    }
    const larg = cume.largura * W
    const em = (t: number) => {
      let d = t
      for (let i = 0; i < seg.length; i++) {
        if (d <= seg[i]! || i === seg.length - 1) {
          const f = Math.min(1, d / seg[i]!)
          const a = pts[i]!
          const b = pts[i + 1]!
          const nx = -(b.y - a.y) / seg[i]!
          const ny = (b.x - a.x) / seg[i]!
          return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, nx, ny }
        }
        d -= seg[i]!
      }
      return { x: pts[0]!.x, y: pts[0]!.y, nx: 0, ny: 1 }
    }
    for (let t = 0, k = 0; t < L; k++) {
      const p = em(t)
      // a rounder envelope (exponent 0.8) so peaks climb and fall gradually instead of plateauing
      const env = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0.04, t / L))), 0.8) * cume.forca
      // irregular spacing and a lateral wander, so no two rows line up
      const off = ((h2(ri, k, 11) - 0.5) * 2 * larg * 1.0 + noise(t / 70 + ri * 9, 3) * larg * 0.4) * (0.75 + 0.25 * env)
      const x = p.x + p.nx * off
      const y = p.y + p.ny * off
      if (h2(ri, k, 12) < 0.3 * (1 - env)) {
        t += A.passoCume * (0.5 + h2(ri, k, 13))
        continue
      }
      // slow size drift along the ridge (low-frequency noise) plus a small per-peak jitter: neighbours stay related
      const deriva = 1 + 0.13 * noise(t / 55 + ri * 7, 5) + 0.07 * (h2(ri, k, 14) - 0.5) * 2
      const tam = Math.min(cume.tamMax ?? 99, (9 + 20 * env) * (cume.escala ?? 1) * deriva)
      const neve = cume.neve && tam > 21 && env > 0.65
      tentar({ x, y, tipo: 'montanha', tam, neve, rot: 0, v: h2(ri, k, 15), origem: 'cume' }, 8 + tam * 0.45, A.margemAgua - 4)
      // a medium and a small neighbour, staggered, so the sizes step down high > medium > small
      if (cume.largura > 0.014 && h2(ri, k, 16) < 0.55) {
        const lado = h2(ri, k, 17) < 0.5 ? -1 : 1
        const t2 = tam * (0.5 + 0.2 * h2(ri, k, 18))
        if (tam > 18 && h2(ri, k, 27) < 0.5) {
          const tm = tam * (0.68 + 0.1 * h2(ri, k, 28))
          tentar({ x: x - p.nx * lado * larg * (0.5 + 0.4 * h2(ri, k, 29)) + p.ny * 6, y: y - p.ny * lado * larg * (0.5 + 0.4 * h2(ri, k, 29)) - p.nx * 6, tipo: 'montanha', tam: tm, neve: false, rot: 0, v: h2(ri, k, 30), origem: 'cume' }, 8 + tm * 0.45, A.margemAgua - 4)
        }
        tentar({ x: x + p.nx * lado * larg * (0.55 + 0.5 * h2(ri, k, 26)), y: y + p.ny * lado * larg * (0.55 + 0.5 * h2(ri, k, 26)), tipo: 'montanha', tam: t2, neve: false, rot: 0, v: h2(ri, k, 19), origem: 'cume' }, 8 + t2 * 0.45, A.margemAgua - 4)
      }
      if (h2(ri, k, 20) < 0.22 * env + 0.05) {
        const lado = h2(ri, k, 21) < 0.5 ? -1 : 1
        const t3 = 8 + 4 * h2(ri, k, 22)
        tentar({ x: x + p.nx * lado * larg * (1.4 + h2(ri, k, 23)), y: y + p.ny * lado * larg * (1.4 + h2(ri, k, 23)), tipo: 'colina', tam: t3, neve: false, rot: 0, v: h2(ri, k, 24), origem: 'sope' }, 13, A.margemAgua - 4)
      }
      t += A.passoCume * (0.35 + 1.5 * h2(ri, k, 25))
    }
  }

  // ---- 2. intentional clearings inside the cores ----
  const clareiras: Clareira[] = []
  for (let gy = 0; gy < 0.32 * H; gy += 40) {
    for (let gx = 0.5 * W; gx < 0.9 * W; gx += 40) {
      if (clareiras.length >= 8) break
      const x = gx + (h2(gx, gy, 31) - 0.5) * 40
      const y = gy + (h2(gx, gy, 32) - 0.5) * 40
      if (at(Math.round(x), Math.round(y)) < 0.08 || pesoT(x, y) < 0.6) continue
      if (nucleoValor(x, y, noise, W, H) < 0.4 || h2(gx, gy, 33) > 0.85) continue
      if (clareiras.some((c) => Math.hypot(c.x - x, c.y - y) < A.clareiraMin)) continue
      if (pinsPx.some((p) => Math.hypot(p.x - x, p.y - y) < 60)) continue
      if (obst?.perto(x, y, 30)) continue
      clareiras.push({ x, y, rx: 28 + 30 * h2(gx, gy, 34), ry: 20 + 24 * h2(gx, gy, 35), rot: (h2(gx, gy, 36) - 0.5) * 1.6 })
    }
  }
  const claro = (x: number, y: number) => {
    let v = 0
    for (const c of clareiras) v = Math.max(v, dentroClareira(x, y, c))
    return v
  }

  // ---- 3. forest masses around the cores (blue-noise darts, irregular radii) ----
  type Cand = { x: number; y: number; pri: number }
  const cand: Cand[] = []
  for (let gy = 0; gy < 0.32 * H; gy += 8) {
    for (let gx = 0.5 * W; gx < 0.92 * W; gx += 8) {
      cand.push({ x: gx + (h2(gx, gy, 1) - 0.5) * 8, y: gy + (h2(gx, gy, 2) - 0.5) * 8, pri: h2(gx, gy, 3) })
    }
  }
  cand.sort((a, b) => b.pri - a.pri)
  for (const c of cand) {
    const { x, y } = c
    const wT = pesoT(x, y)
    if (wT < 0.12) continue
    const core = nucleoValor(x, y, noise, W, H)
    const cl = claro(x, y)
    const prob = wT * (Math.pow(core, A.pExp) * (1 - 0.95 * cl) + 0.025 * (1 - cl))
    if (h2(x, y, 4) > prob) continue
    const tam = (A.tamConifBase + A.tamConifVar * core) * (0.8 + 0.4 * h2(x, y, 5))
    const r = (A.rConifBase + (1 - core) * A.rConifVar) * (0.85 + 0.35 * h2(x, y, 8))
    tentar({ x, y, tipo: 'conifera', tam, neve: false, rot: (h2(x, y, 6) - 0.5) * 0.2, v: h2(x, y, 7), origem: 'nucleo' }, r, A.margemAgua)
  }

  // ---- 4. small groves (3 to 7 trees) on open ground, so the edges stay organic ----
  for (let gy = 0; gy < 0.32 * H; gy += 62) {
    for (let gx = 0.5 * W; gx < 0.92 * W; gx += 62) {
      const px = gx + (h2(gx, gy, 41) - 0.5) * 62
      const py = gy + (h2(gx, gy, 42) - 0.5) * 62
      if (at(Math.round(px), Math.round(py)) < 0.08 || pesoT(px, py) < 0.45) continue
      if (nucleoValor(px, py, noise, W, H) > 0.45 || claro(px, py) > 0.3) continue
      if (h2(gx, gy, 43) > A.bosquesProb) continue
      const n = 3 + Math.floor(h2(gx, gy, 44) * 5)
      for (let i = 0; i < n; i++) {
        const ang = h2(gx, gy, 50 + i) * Math.PI * 2
        const rad = 4 + 13 * h2(gx, gy, 60 + i)
        const tam = 6.5 + 2.5 * h2(gx, gy, 70 + i)
        tentar({ x: px + Math.cos(ang) * rad, y: py + Math.sin(ang) * rad, tipo: 'conifera', tam, neve: false, rot: (h2(gx, gy, 80 + i) - 0.5) * 0.2, v: h2(gx, gy, 90 + i), origem: 'bosque' }, 9, A.margemAgua)
      }
    }
  }
  glifos.sort((a, b) => a.y - b.y)

  const massas: PlanoTerrasen['massas'] = []
  for (let gy = 0; gy < 0.32 * H; gy += 16) {
    for (let gx = 0.5 * W; gx < 0.92 * W; gx += 16) {
      if (at(Math.round(gx), Math.round(gy)) < 0.08 || pesoT(gx, gy) < 0.5) continue
      const core = nucleoValor(gx, gy, noise, W, H)
      if (core > 0.6 && claro(gx, gy) < 0.3) massas.push({ x: gx, y: gy, r: 18, a: A.lavagemMassa * core })
    }
  }
  return { glifos, clareiras, massas }
}

/** Soft washes under the glyphs: shaded forest floor and pale clearings (intensity is a tunable). */
export function desenharWashes(ctx: CanvasRenderingContext2D, plano: PlanoTerrasen, modo: ModoDesenho, ajuste?: Partial<AjusteTerrasen>) {
  const A = { ...AJUSTE_PADRAO, ...ajuste }
  const { subbosque, clareira } = PALETA_TERRASEN
  const sub = modo === 'cor' ? subbosque : '#5a4630'
  const cla = modo === 'cor' ? clareira : '#efe3bd'
  for (const m of plano.massas) {
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r)
    g.addColorStop(0, hexA(sub, m.a * 2.4))
    g.addColorStop(1, hexA(sub, 0))
    ctx.fillStyle = g
    ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2)
  }
  for (const c of plano.clareiras) {
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(c.rot)
    ctx.scale(c.rx * 1.25, c.ry * 1.25)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, hexA(cla, A.lavagemClareira))
    g.addColorStop(0.6, hexA(cla, A.lavagemClareira * 0.6))
    g.addColorStop(1, hexA(cla, 0))
    ctx.fillStyle = g
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}

/** Drops default glyphs that fall inside Terrasen; everything else is kept untouched. */
export function filtrarForaDeTerrasen<T extends { x: number; y: number }>(ops: T[], pesoT: (x: number, y: number) => number): T[] {
  return ops.filter((o) => pesoT(o.x, o.y) <= 0.12)
}
