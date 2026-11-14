import lugaresJson from '../../data/lugares.json'
import type { Place } from '../../types'
import type { Obstaculos } from '../hidrografia'

/**
 * PROTOTYPE (branch bioma-terrasen, off by default: ?terrasen=A|B|C).
 * Visual proposal for the pilot region. It only touches the Terrasen zones (ids "r03-*"): palette,
 * forest masses, clearings, ridge-aligned mountains and three symbol styles. Nothing here is
 * merged or final; the geography, rivers, lakes, pins and routes are never moved.
 */

export type EstiloTerrasen = 'A' | 'B' | 'C'
export type ModoDesenho = 'cor' | 'sepia'
export interface ProtoTerrasen {
  estilo: EstiloTerrasen
}

export const ZONAS_TERRASEN = (id: string) => id.startsWith('r03-')
export const ZONA_MONTANHAS = 'r03-montanhas-norte'

/** Proposed palette. Hexes come from the plan; distances to the neighbouring biomes were measured (Lab dE). */
export const PALETA_TERRASEN = {
  chao: '#527A70',
  floresta: '#1F4040',
  subbosque: '#173433',
  copaLuz: '#3A6B62',
  clareira: '#8FAA9C',
  bordaSul: '#66875F',
  rocha: '#78878D',
  rochaLuz: '#A9B7BC',
  rochaSombra: '#56646B',
  neve: '#DCE5E8',
  neveSombra: '#B8C9D0',
  neveBrilho: '#EDF1EF',
  tinta: '#40382D',
} as const

const PALETA_ZONAS: Record<string, { cor?: string; arv?: string; rocha?: string }> = {
  'r03-terrasen': { cor: PALETA_TERRASEN.chao, arv: PALETA_TERRASEN.floresta, rocha: PALETA_TERRASEN.rocha },
  'r03-pinhal-denso': { cor: '#2B4F4B', arv: PALETA_TERRASEN.floresta },
  'r03-montanhas-norte': { cor: '#7A8680', rocha: PALETA_TERRASEN.rocha },
}

/** Returns the zones with the proposed palette applied to the Terrasen ones only. */
export function aplicarPaleta<T extends { id: string; cor: string; arv?: string; rocha?: string }>(zonas: T[]): T[] {
  return zonas.map((z) => (PALETA_ZONAS[z.id] ? { ...z, ...PALETA_ZONAS[z.id] } : z))
}

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

/** Tunables of the planner (the probe sweeps them; the defaults are the proposal). */
export interface AjusteTerrasen {
  coreA: number
  coreB: number
  clearA: number
  clearB: number
  ridgeA: number
  ridgeB: number
  mtBase: number
  limiarMontanha: number
  limiarColina: number
  pColina: number
  rConifBase: number
  rConifVar: number
  tamConifBase: number
  tamConifVar: number
  stragglers: number
  pExp: number
  rMontBase: number
  rMontK: number
}

export const AJUSTE_PADRAO: AjusteTerrasen = {
  coreA: 0.1,
  coreB: 0.6,
  clearA: 0.28,
  clearB: 0.46,
  ridgeA: 0.38,
  ridgeB: 0.74,
  mtBase: 0.3,
  limiarMontanha: 0.3,
  limiarColina: 0.3,
  pColina: 0.08,
  rConifBase: 10.5,
  rConifVar: 22,
  tamConifBase: 6.5,
  tamConifVar: 5.5,
  stragglers: 0.05,
  pExp: 0.8,
  rMontBase: 9,
  rMontK: 0.38,
}

export interface GlifoT {
  x: number
  y: number
  tipo: 'conifera' | 'montanha' | 'colina'
  tam: number
  neve: boolean
  rot: number
  v: number
}

export interface PlanoTerrasen {
  glifos: GlifoT[]
  clareiras: { x: number; y: number; r: number }[]
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
  /** Extra clearance (px) kept around place icons. */
  folgaIcone?: number
  ajuste?: AjusteTerrasen
}

const PINS = (lugaresJson as Place[]).map((p) => ({ x: p.x, y: p.y }))

/** Density fields: forest cores, clearings and ridge lines, all from low-frequency noise. */
export function campos(x: number, y: number, noise: (x: number, y: number) => number, a: AjusteTerrasen = AJUSTE_PADRAO) {
  const f1 = noise(x / 330 + 11, y / 330)
  const f2 = noise(x / 150 + 3, y / 150 + 9)
  const core = sm(a.coreA, a.coreB, 0.65 * f1 + 0.35 * f2 + 0.1)
  const clear = sm(a.clearA, a.clearB, noise(x / 100 + 7, y / 100 + 21))
  const R = 1 - Math.abs(noise(x / 230 + 40, y / 230 + 5))
  return { core, clear, R }
}

/**
 * Plans forest masses, clearings and ridge chains with blue-noise (variable-radius Poisson) sampling.
 * Only inside Terrasen (feathered weight), only on land, never over water, place icons or lakes.
 */
export function planejarTerrasen(e: EntradaPlano): PlanoTerrasen {
  const { W, H, at, noise, pesoT, pesoMont, obst } = e
  const A = e.ajuste ?? AJUSTE_PADRAO
  const folga = e.folgaIcone ?? 26
  const pinsPx = PINS.map((p) => ({ x: p.x * W, y: p.y * H }))
  type Cand = { x: number; y: number; pri: number }
  const cand: Cand[] = []
  const x0 = 0.5 * W
  const x1 = 0.92 * W
  const y1 = 0.32 * H
  for (let gy = 0; gy < y1; gy += 8) {
    for (let gx = x0; gx < x1; gx += 8) {
      const x = gx + (h2(gx, gy, 1) - 0.5) * 8
      const y = gy + (h2(gx, gy, 2) - 0.5) * 8
      cand.push({ x, y, pri: h2(gx, gy, 3) })
    }
  }
  cand.sort((a, b) => b.pri - a.pri)

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
  for (const c of cand) {
    const { x, y } = c
    if (at(Math.round(x), Math.round(y)) < 0.08) continue
    const wT = pesoT(x, y)
    if (wT < 0.12) continue
    if (pinsPx.some((p) => Math.hypot(p.x - x, p.y - y) < folga)) continue
    const { core, clear, R } = campos(x, y, noise, A)
    const mt = A.mtBase + (1 - A.mtBase) * pesoMont(x, y)
    const M = sm(A.ridgeA, A.ridgeB, R) * mt * Math.min(1, wT * 1.6)
    const hh = h2(x, y, 4)
    let tipo: GlifoT['tipo']
    let r: number
    let tam: number
    let neve = false
    if (M > A.limiarMontanha) {
      tipo = 'montanha'
      tam = (12 + 22 * Math.pow(M, 0.9)) * (0.85 + 0.3 * h2(x, y, 5))
      r = A.rMontBase + tam * A.rMontK
      neve = M > 0.8 && pesoMont(x, y) > 0.35
    } else if (M > A.limiarColina && hh < A.pColina) {
      tipo = 'colina'
      tam = 8 + 5 * h2(x, y, 5)
      r = 13
    } else {
      const prob = wT * (Math.pow(core, A.pExp) * (1 - 0.92 * clear) + A.stragglers * (1 - clear))
      if (hh > prob) continue
      tipo = 'conifera'
      tam = (A.tamConifBase + A.tamConifVar * core) * (0.8 + 0.4 * h2(x, y, 5))
      r = A.rConifBase + (1 - core) * A.rConifVar
    }
    if (!livre(x, y, r)) continue
    if (obst?.perto(x, y, 8 + tam * 0.8)) continue
    const lista = grade.get(chave((x / CELL) | 0, (y / CELL) | 0)) ?? []
    lista.push({ x, y, r })
    grade.set(chave((x / CELL) | 0, (y / CELL) | 0), lista)
    glifos.push({ x, y, tipo, tam, neve, rot: (h2(x, y, 6) - 0.5) * 0.2, v: h2(x, y, 7) })
  }
  glifos.sort((a, b) => a.y - b.y)

  const clareiras: PlanoTerrasen['clareiras'] = []
  const massas: PlanoTerrasen['massas'] = []
  for (let gy = 0; gy < y1; gy += 16) {
    for (let gx = x0; gx < x1; gx += 16) {
      if (at(Math.round(gx), Math.round(gy)) < 0.08 || pesoT(gx, gy) < 0.5) continue
      const { core, clear } = campos(gx, gy, noise, A)
      if (clear > 0.6 && core > 0.3) clareiras.push({ x: gx, y: gy, r: 14 + clear * 6 })
      else if (core > 0.6 && clear < 0.3) massas.push({ x: gx, y: gy, r: 18, a: 0.11 * core })
    }
  }
  return { glifos, clareiras, massas }
}

/** Soft washes under the glyphs: shaded forest floor and pale clearings. */
export function desenharWashes(ctx: CanvasRenderingContext2D, plano: PlanoTerrasen, modo: ModoDesenho) {
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
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r)
    g.addColorStop(0, hexA(cla, modo === 'cor' ? 0.42 : 0.5))
    g.addColorStop(1, hexA(cla, 0))
    ctx.fillStyle = g
    ctx.fillRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2)
  }
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}

interface Cores {
  escuro: string
  luz: string
  sombra: string
  rocha: string
  rochaLuz: string
  rochaSombra: string
  neve: string
  neveSombra: string
  tinta: string
  hachura: string
}

const cores = (modo: ModoDesenho): Cores =>
  modo === 'cor'
    ? {
        escuro: PALETA_TERRASEN.floresta,
        luz: PALETA_TERRASEN.copaLuz,
        sombra: PALETA_TERRASEN.subbosque,
        rocha: PALETA_TERRASEN.rocha,
        rochaLuz: PALETA_TERRASEN.rochaLuz,
        rochaSombra: PALETA_TERRASEN.rochaSombra,
        neve: PALETA_TERRASEN.neve,
        neveSombra: PALETA_TERRASEN.neveSombra,
        tinta: 'rgba(64,56,45,0.9)',
        hachura: 'rgba(40,36,30,0.55)',
      }
    : {
        escuro: 'rgba(78,62,40,0.78)',
        luz: 'rgba(150,128,92,0.78)',
        sombra: 'rgba(52,40,26,0.85)',
        rocha: '#d9c9a0',
        rochaLuz: '#f1e4c0',
        rochaSombra: 'rgba(92,68,42,0.55)',
        neve: '#f7efd6',
        neveSombra: '#e2d2a6',
        tinta: 'rgba(62,44,28,0.92)',
        hachura: 'rgba(62,44,28,0.6)',
      }

function tri(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, fill: string) {
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.lineTo(cx, cy)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** A: stacked tiers with a lit half. B: engraved fir with hatching. C: top-down needle crown. */
function conifera(ctx: CanvasRenderingContext2D, g: GlifoT, estilo: EstiloTerrasen, c: Cores) {
  const { x, y, tam: s } = g
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(g.rot)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (estilo === 'A') {
    ctx.strokeStyle = c.tinta
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const w = s * (0.98 - 0.24 * i)
      const base = s * 0.15 - i * s * 0.52
      const top = base - s * 0.95
      tri(ctx, -w, base, 0, top, w, base, c.escuro)
      tri(ctx, -w, base, 0, top, 0, base, c.luz)
      ctx.beginPath()
      ctx.moveTo(-w, base)
      ctx.lineTo(0, top)
      ctx.lineTo(w, base)
      ctx.closePath()
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(0, s * 0.15)
    ctx.lineTo(0, s * 0.5)
    ctx.stroke()
  } else if (estilo === 'B') {
    const w = s * 0.62
    const top = -s * 1.7
    tri(ctx, -w, 0, 0, top, w, 0, c.luz)
    tri(ctx, 0, 0, 0, top, w, 0, c.escuro)
    ctx.strokeStyle = c.hachura
    ctx.lineWidth = 0.9
    for (let i = 1; i <= 5; i++) {
      const t = i / 6
      ctx.beginPath()
      ctx.moveTo(w * 0.1 * (1 - t) + w * 0.05, top + (0 - top) * t)
      ctx.lineTo(w * (t * 0.95), top + (0 - top) * t + s * 0.18)
      ctx.stroke()
    }
    ctx.strokeStyle = c.tinta
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(-w, 0)
    ctx.lineTo(0, top)
    ctx.lineTo(w, 0)
    ctx.closePath()
    ctx.moveTo(0, top)
    ctx.lineTo(0, 0)
    ctx.moveTo(0, 0)
    ctx.lineTo(0, s * 0.45)
    ctx.stroke()
  } else {
    // top-down crown: needle burst with a soft drop shadow and a lit centre
    const n = 7
    const rot = g.v * Math.PI
    const burst = (cx: number, cy: number, k: number) => {
      ctx.beginPath()
      for (let i = 0; i < n * 2; i++) {
        const a = rot + (i * Math.PI) / n
        const r = (i % 2 === 0 ? s * 1.0 : s * 0.58) * k
        const px = cx + Math.cos(a) * r
        const py = cy + Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    }
    burst(s * 0.3, s * 0.35, 1)
    ctx.fillStyle = 'rgba(14,26,24,0.28)'
    ctx.fill()
    burst(0, 0, 1)
    ctx.fillStyle = c.luz
    ctx.fill()
    ctx.strokeStyle = 'rgba(40,52,48,0.55)'
    ctx.lineWidth = 0.7
    ctx.stroke()
    burst(s * 0.12, s * 0.14, 0.6)
    ctx.fillStyle = c.escuro
    ctx.fill()
  }
  ctx.restore()
}

function montanha(ctx: CanvasRenderingContext2D, g: GlifoT, estilo: EstiloTerrasen, c: Cores) {
  const { x, y, tam: s } = g
  const neve = g.neve
  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = c.tinta
  const cume = (cx: number, h: number, w: number, snow: boolean, hatch: boolean) => {
    tri(ctx, cx - w, 0, cx - w * 0.1, -h, cx + w * 0.1, 0, c.rochaLuz)
    tri(ctx, cx - w * 0.1, -h, cx + w, 0, cx + w * 0.1, 0, c.rochaSombra)
    if (hatch) {
      ctx.strokeStyle = c.hachura
      ctx.lineWidth = 0.8
      for (let i = 1; i <= 4; i++) {
        const t = i / 5
        ctx.beginPath()
        ctx.moveTo(cx + w * 0.1 + w * 0.8 * t * 0.5, -h * (1 - t) + h * 0.05)
        ctx.lineTo(cx + w * 0.1 + w * 0.8 * t * 0.9, -h * (1 - t) * 0.5 - h * 0.05 + h * 0.2 * t)
        ctx.stroke()
      }
    }
    if (snow) {
      const k = 0.36
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.1, -h)
      ctx.lineTo(cx - w * 0.1 - w * k, -h * (1 - k * 1.1))
      ctx.lineTo(cx - w * 0.1 - w * k * 0.35, -h * (1 - k * 0.95))
      ctx.lineTo(cx - w * 0.02, -h * (1 - k * 1.15))
      ctx.lineTo(cx + w * 0.12, -h * (1 - k * 0.95))
      ctx.lineTo(cx - w * 0.1 + w * k, -h * (1 - k * 1.1))
      ctx.closePath()
      ctx.fillStyle = c.neve
      ctx.fill()
      tri(ctx, cx - w * 0.1, -h, cx - w * 0.1 + w * k, -h * (1 - k * 1.1), cx + w * 0.12, -h * (1 - k * 0.95), c.neveSombra)
    }
    ctx.strokeStyle = c.tinta
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(cx - w, 0)
    ctx.lineTo(cx - w * 0.1, -h)
    ctx.lineTo(cx + w, 0)
    ctx.stroke()
  }
  if (g.tipo === 'colina') {
    cume(0, s * 1.25, s * 0.8, false, false)
  } else if (estilo === 'A') {
    cume(s * 0.6, s * 0.95, s * 0.7, false, false)
    cume(-s * 0.1, s * 1.4, s * 1.0, neve, false)
  } else if (estilo === 'B') {
    cume(-s * 1.05, s * 0.8, s * 0.62, false, true)
    cume(s * 1.05, s * 0.95, s * 0.66, false, true)
    cume(0, s * 1.4, s * 0.86, neve, true)
  } else {
    // C: rounded engraved mass with vertical hatching on the shaded side and strata on the lit side
    ctx.beginPath()
    ctx.moveTo(-s * 1.15, 0)
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.6, -s * 0.1, -s * 1.45)
    ctx.quadraticCurveTo(s * 0.5, -s * 0.8, s * 0.9, -s * 0.5)
    ctx.quadraticCurveTo(s * 1.15, -s * 0.2, s * 1.2, 0)
    ctx.closePath()
    ctx.fillStyle = c.rochaLuz
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = c.rochaSombra
    ctx.fillRect(s * 0.05, -s * 1.4, s * 1.3, s * 1.5)
    ctx.strokeStyle = c.hachura
    ctx.lineWidth = 0.9
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      ctx.moveTo(s * 0.12 + i * s * 0.13, -s * 1.15 + i * s * 0.07)
      ctx.lineTo(s * 0.12 + i * s * 0.13, 0)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(64,56,45,0.35)'
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath()
      ctx.moveTo(-s * 1.0 + i * s * 0.12, -s * 0.28 * i)
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.28 * i + s * 0.1, -s * 0.05, -s * 0.24 * i)
      ctx.stroke()
    }
    if (neve) {
      ctx.fillStyle = c.neve
      ctx.beginPath()
      ctx.moveTo(-s * 0.75, -s * 0.62)
      ctx.quadraticCurveTo(-s * 0.2, -s * 1.5, s * 0.6, -s * 0.8)
      ctx.quadraticCurveTo(s * 0.3, -s * 0.85, s * 0.1, -s * 0.62)
      ctx.quadraticCurveTo(-s * 0.15, -s * 0.8, -s * 0.4, -s * 0.58)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    ctx.strokeStyle = c.tinta
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-s * 1.15, 0)
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.6, -s * 0.1, -s * 1.45)
    ctx.quadraticCurveTo(s * 0.5, -s * 0.8, s * 0.9, -s * 0.5)
    ctx.quadraticCurveTo(s * 1.15, -s * 0.2, s * 1.2, 0)
    ctx.stroke()
  }
  ctx.restore()
}

export function desenharGlifoT(ctx: CanvasRenderingContext2D, g: GlifoT, estilo: EstiloTerrasen, modo: ModoDesenho) {
  const c = cores(modo)
  if (g.tipo === 'conifera') conifera(ctx, g, estilo, c)
  else montanha(ctx, g, estilo, c)
}

/** Drops default glyphs that fall inside Terrasen; everything else is kept untouched. */
export function filtrarForaDeTerrasen<T extends { x: number; y: number }>(ops: T[], pesoT: (x: number, y: number) => number): T[] {
  return ops.filter((o) => pesoT(o.x, o.y) <= 0.12)
}
