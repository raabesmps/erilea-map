import biomasData from '../data/biomas.json'
import { aplicarPaleta, criarPeso, desenharGlifoT, desenharWashes, filtrarForaDeTerrasen, planejarTerrasen, ZONA_MONTANHAS, ZONAS_TERRASEN, type PlanoTerrasen, type ProtoTerrasen } from './proto/terrasen'
import { ativos, catmullRom, criarObstaculos, dentroDoPoligono, lagoPoligono, rioPontos, type HidroAtiva, type Obstaculos } from './hidrografia'

/**
 * Coloured painter, following the project's art direction guide.
 * Layers (bottom to top): paper + biomes/soils -> ocean + rivers -> coastline
 * -> mountains and forests. Frame, compass and labels are added by the caller.
 */

type RGB = [number, number, number]
type GlyphKey = 'montanha' | 'arvore' | 'conifera' | 'duna' | 'junco' | 'colina'

interface Zona {
  id: string
  tipo: string
  cx: number
  cy: number
  rx: number
  ry: number
  cor: string
  arv?: string
  rocha?: string
  neve?: boolean
  peso?: number
  glifos?: Partial<Record<GlyphKey, number>>
}

interface MarZona {
  id: string
  cx: number
  cy: number
  rx: number
  ry: number
  costeiro?: string
  medio?: string
  fundo?: string
}

interface Biomas {
  padrao: { cor: string; arv: string; rocha: string; glifos: Partial<Record<GlyphKey, number>> }
  zonas: Zona[]
  mar: { padrao: { costeiro: string; medio: string; fundo: string }; zonas: MarZona[] }
  rios: { id: string; x?: number; y?: number; pontos?: [number, number][]; nome?: { pt: string; en: string } }[]
}

const B = biomasData as unknown as Biomas

export interface PaintCtx {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  elev: Float32Array
  at: (x: number, y: number) => number
  rnd: () => number
  noise: (x: number, y: number) => number
  /** Active lakes and rivers read from the printed map; defaults to the highest-confidence tier. */
  hidro?: HidroAtiva
  /** PROTOTYPE (off by default): Terrasen visual proposal, see proto/terrasen.ts. */
  proto?: ProtoTerrasen
}

const INK: RGB = [64, 56, 45] // #40382D from the guide
const SAND: RGB = [216, 197, 154] // #D8C59A coastal sand
const INK_HEX = '#40382D'

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

/** Lighten (f>0) or darken (f<0) a colour. */
const shade = (c: RGB, f: number): RGB => (f >= 0 ? mix(c, [255, 255, 255], f) : mix(c, [0, 0, 0], -f))

const S = 4 // biome field resolution divisor

interface Field {
  LW: number
  LH: number
  r: Float32Array
  g: Float32Array
  b: Float32Array
  best: Uint8Array
}

export function buildField(W: number, H: number, noise: (x: number, y: number) => number, zonasFonte: Zona[] = B.zonas): Field {
  const LW = Math.ceil(W / S)
  const LH = Math.ceil(H / S)
  const r = new Float32Array(LW * LH)
  const g = new Float32Array(LW * LH)
  const b = new Float32Array(LW * LH)
  const best = new Uint8Array(LW * LH).fill(255)
  const def = hex(B.padrao.cor)
  const zonas = zonasFonte.map((z) => ({ ...z, rgb: hex(z.cor) }))
  for (let ly = 0; ly < LH; ly++) {
    for (let lx = 0; lx < LW; lx++) {
      const nx = ((lx + 0.5) * S) / W
      const ny = ((ly + 0.5) * S) / H
      // distort the zone edges so they read as watercolour washes, not ellipses
      const wx = nx + 0.022 * noise(nx * 5 + 3, ny * 5 + 3) + 0.01 * noise(nx * 14, ny * 14)
      const wy = ny + 0.022 * noise(nx * 5 + 13, ny * 5 + 13) + 0.01 * noise(nx * 14 + 7, ny * 14)
      let sw = 0.1
      let sr = def[0] * sw
      let sg = def[1] * sw
      let sb = def[2] * sw
      let bw = 0
      let bi = 255
      for (let i = 0; i < zonas.length; i++) {
        const z = zonas[i]!
        const dx = (wx - z.cx) / z.rx
        const dy = (wy - z.cy) / z.ry
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d >= 1.25) continue
        const w = smooth(clamp01((1.25 - d) / 0.75)) * (z.peso ?? 1)
        sr += z.rgb[0] * w
        sg += z.rgb[1] * w
        sb += z.rgb[2] * w
        sw += w
        if (w > bw) {
          bw = w
          bi = i
        }
      }
      const k = ly * LW + lx
      r[k] = sr / sw
      g[k] = sg / sw
      b[k] = sb / sw
      best[k] = bw < 0.3 ? 255 : bi
    }
  }
  return { LW, LH, r, g, b, best }
}

function sampleField(f: Field, x: number, y: number): RGB {
  const fx = Math.min(f.LW - 1.001, Math.max(0, x / S - 0.5))
  const fy = Math.min(f.LH - 1.001, Math.max(0, y / S - 0.5))
  const x0 = fx | 0
  const y0 = fy | 0
  const tx = fx - x0
  const ty = fy - y0
  const i00 = y0 * f.LW + x0
  const i10 = i00 + 1
  const i01 = i00 + f.LW
  const i11 = i01 + 1
  const lerp = (a: Float32Array) => (a[i00]! * (1 - tx) + a[i10]! * tx) * (1 - ty) + (a[i01]! * (1 - tx) + a[i11]! * tx) * ty
  return [lerp(f.r), lerp(f.g), lerp(f.b)]
}

export function paintColorido(p: PaintCtx) {
  const { ctx, W, H, elev, at, rnd, noise } = p
  const zonasUsadas = p.proto ? aplicarPaleta(B.zonas) : B.zonas
  const field = buildField(W, H, noise, zonasUsadas)
  const img = ctx.createImageData(W, H)
  const d = img.data

  const sea = {
    costeiro: hex(B.mar.padrao.costeiro),
    medio: hex(B.mar.padrao.medio),
    fundo: hex(B.mar.padrao.fundo),
  }
  const seaZones = B.mar.zonas.map((z) => ({
    ...z,
    costeiro: z.costeiro ? hex(z.costeiro) : undefined,
    medio: z.medio ? hex(z.medio) : undefined,
    fundo: z.fundo ? hex(z.fundo) : undefined,
  }))

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = elev[y * W + x]!
      const i = (y * W + x) * 4
      const grain = (rnd() - 0.5) * 8
      let r: number
      let g: number
      let b: number

      if (e > 0) {
        const base = sampleField(field, x, y)
        const mott = 1 + 0.09 * noise((x / W) * 20 + 80, (y / W) * 20)
        const slope = (at(x + 2, y + 2) - at(x - 2, y - 2)) * 34
        const hi = clamp01((e - 0.15) / 0.7)
        const dark = 1 - 0.1 * hi
        let c: RGB = [base[0] * mott * dark - slope, base[1] * mott * dark - slope, base[2] * mott * dark - slope * 0.8]
        // sandy fringe along the shore
        const shore = clamp01(1 - e / 0.07)
        if (shore > 0) c = mix(c, SAND, 0.5 * shore)
        // warm parchment glaze over everything
        r = c[0] * 0.98 + grain
        g = c[1] * 0.96 + grain
        b = c[2] * 0.9 + grain
        if (at(x - 2, y) <= 0 || at(x + 2, y) <= 0 || at(x, y - 2) <= 0 || at(x, y + 2) <= 0) {
          r = INK[0]
          g = INK[1]
          b = INK[2]
        }
      } else {
        const depth = -e
        const nx = x / W
        const ny = y / H
        let costeiro = sea.costeiro
        let medio = sea.medio
        let fundo = sea.fundo
        for (const z of seaZones) {
          const dx = (nx - z.cx) / z.rx
          const dy = (ny - z.cy) / z.ry
          const dd = Math.sqrt(dx * dx + dy * dy)
          if (dd >= 1.2) continue
          const w = smooth(clamp01((1.2 - dd) / 0.7))
          if (z.costeiro) costeiro = mix(costeiro, z.costeiro, w)
          if (z.medio) medio = mix(medio, z.medio, w)
          if (z.fundo) fundo = mix(fundo, z.fundo, w)
        }
        const t1 = smooth(clamp01(depth / 0.09))
        const t2 = smooth(clamp01((depth - 0.09) / 0.45))
        const c = mix(mix(costeiro, medio, t1), fundo, t2)
        const m = 1 + 0.05 * noise((x / W) * 9 + 40, (y / W) * 9 + 40)
        r = c[0] * m * 0.98 + grain
        g = c[1] * m * 0.97 + grain
        b = c[2] * m * 0.95 + grain
        if (depth < 0.09) {
          // second, finer coastline a few pixels out (double contour)
          if (at(x - 6, y) > 0 || at(x + 6, y) > 0 || at(x, y - 6) > 0 || at(x, y + 6) > 0 || at(x - 4, y - 4) > 0 || at(x + 4, y + 4) > 0 || at(x - 4, y + 4) > 0 || at(x + 4, y - 4) > 0) {
            r = r * 0.55 + INK[0] * 0.45
            g = g * 0.55 + INK[1] * 0.45
            b = b * 0.55 + INK[2] * 0.45
          }
        }
      }
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const hidro = p.hidro ?? ativos('alta')
  const lagos = hidro.lagos.map((l) => lagoPoligono(l, W, H))
  const rios = [...tracarRios(p, hidro.substituidos).map((r) => r.pts), ...hidro.rios.map((r) => rioPontos(r, W, H, at))]
  const obst = criarObstaculos(lagos, rios)
  const proto = p.proto ? planoProto(p, field, zonasUsadas, obst) : undefined
  drawWaves(p)
  if (proto) desenharWashes(ctx, proto.plano, 'cor')
  for (const poly of lagos) drawLake(ctx, poly)
  drawRiverSet(ctx, rios)
  drawGlyphs(p, field, obst, zonasUsadas, proto)

  // aged-paper vignette, lighter than the sepia style so the colour stays readable
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.72)
  g.addColorStop(0, 'rgba(120,80,30,0)')
  g.addColorStop(1, 'rgba(90,52,18,0.38)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/** Small sepia wave strokes spread over the water. */
function drawWaves({ ctx, W, H, at, rnd }: PaintCtx) {
  ctx.lineCap = 'round'
  ctx.lineWidth = 1.5
  const step = 34
  for (let gy = 70; gy < H - 70; gy += step) {
    for (let gx = 70; gx < W - 70; gx += step) {
      const x = gx + (rnd() - 0.5) * step
      const y = gy + (rnd() - 0.5) * step
      const e = at(Math.round(x), Math.round(y))
      if (e > -0.06) continue
      if (rnd() > 0.5) continue
      const s = 7 + rnd() * 6
      ctx.strokeStyle = css(INK, 0.26 + rnd() * 0.12)
      ctx.beginPath()
      ctx.moveTo(x - s, y)
      ctx.quadraticCurveTo(x - s / 2, y - s * 0.55, x, y)
      ctx.quadraticCurveTo(x + s / 2, y + s * 0.55, x + s, y)
      ctx.stroke()
    }
  }
}

/** Distance-to-sea field (chamfer transform) on a coarse grid: rivers flow downhill on it. */
function seaDistance(W: number, H: number, at: (x: number, y: number) => number) {
  const C = 8
  const LW = Math.ceil(W / C)
  const LH = Math.ceil(H / C)
  const dist = new Float32Array(LW * LH)
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) dist[y * LW + x] = at(x * C, y * C) <= 0 ? 0 : 1e6
  const relax = (x: number, y: number, dx: number, dy: number, c: number) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= LW || ny >= LH) return
    const v = dist[ny * LW + nx]! + c
    if (v < dist[y * LW + x]!) dist[y * LW + x] = v
  }
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { relax(x, y, -1, 0, 1); relax(x, y, 0, -1, 1); relax(x, y, -1, -1, 1.414); relax(x, y, 1, -1, 1.414) }
  for (let y = LH - 1; y >= 0; y--) for (let x = LW - 1; x >= 0; x--) { relax(x, y, 1, 0, 1); relax(x, y, 0, 1, 1); relax(x, y, 1, 1, 1.414); relax(x, y, -1, 1, 1.414) }
  const get = (px: number, py: number) => {
    const fx = Math.min(LW - 1.001, Math.max(0, px / C))
    const fy = Math.min(LH - 1.001, Math.max(0, py / C))
    const x0 = fx | 0
    const y0 = fy | 0
    const tx = fx - x0
    const ty = fy - y0
    const i = y0 * LW + x0
    return (dist[i]! * (1 - tx) + dist[i + 1]! * tx) * (1 - ty) + (dist[i + LW]! * (1 - tx) + dist[i + LW + 1]! * tx) * ty
  }
  return get
}

export interface Rio {
  id: string
  pts: { x: number; y: number }[]
}

/** Rivers wander from their sources down to the sea (pure: no canvas involved). */
export function tracarRios({ W, H, at, noise }: Pick<PaintCtx, 'W' | 'H' | 'at' | 'noise'>, ignorar?: Set<string>): Rio[] {
  const dist = seaDistance(W, H, at)
  const rios: Rio[] = []
  B.rios.forEach((src, idx) => {
    if (ignorar?.has(src.id)) return
    if (src.pontos) {
      // named river with explicit waypoints (e.g. the Avery): smooth them, then run on to the sea
      const way = src.pontos.map(([px, py]) => ({ x: px * W, y: py * H }))
      const pts = catmullRom(way, 6)
      const a = pts[pts.length - 2]!
      const b = pts[pts.length - 1]!
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      let { x: ex, y: ey } = b
      for (let n = 0; n < 160; n++) {
        if (at(Math.round(ex), Math.round(ey)) <= 0) break
        ex += ((b.x - a.x) / len) * 6
        ey += ((b.y - a.y) / len) * 6
        pts.push({ x: ex, y: ey })
      }
      rios.push({ id: src.id, pts })
      return
    }
    let x = (src.x ?? 0) * W
    let y = (src.y ?? 0) * H
    if (at(Math.round(x), Math.round(y)) <= 0.03) return
    const pts = [{ x, y }]
    for (let n = 0; n < 1200; n++) {
      const h = 10
      const gx = dist(x + h, y) - dist(x - h, y)
      const gy = dist(x, y + h) - dist(x, y - h)
      if (Math.abs(gx) + Math.abs(gy) < 1e-4) break
      // downhill on the distance field, bent by noise so the course meanders
      const wiggle = 0.85 * noise(n * 0.045, idx * 7.3)
      const base = Math.atan2(-gy, -gx) + wiggle
      x += Math.cos(base) * 6
      y += Math.sin(base) * 6
      if (x < 60 || y < 60 || x > W - 60 || y > H - 60) break
      pts.push({ x, y })
      if (at(Math.round(x), Math.round(y)) <= 0) break
    }
    if (pts.length > 25) rios.push({ id: src.id, pts })
  })
  return rios
}

/** Draws river courses, widening toward the mouth. */
function drawRiverSet(ctx: CanvasRenderingContext2D, rivers: { x: number; y: number }[][]) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const pass of [0, 1]) {
    for (const pts of rivers) {
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length
        const w = 1.4 + 4.4 * t * t
        ctx.strokeStyle = pass === 0 ? 'rgba(46,86,104,0.85)' : '#5C91AB'
        ctx.lineWidth = pass === 0 ? w + 1.8 : w
        ctx.beginPath()
        ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y)
        ctx.lineTo(pts[i]!.x, pts[i]!.y)
        ctx.stroke()
      }
    }
  }
}

/** Smooth closed path through the outline points (midpoint quadratics). */
export function tracaSuave(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  const n = pts.length
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const m0 = mid(pts[n - 1]!, pts[0]!)
  ctx.beginPath()
  ctx.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i]!, pts[(i + 1) % n]!)
    ctx.quadraticCurveTo(pts[i]![0], pts[i]![1], m[0], m[1])
  }
  ctx.closePath()
}

function centro(poly: [number, number][]): { cx: number; cy: number; r: number } {
  const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length
  const cy = poly.reduce((a, q) => a + q[1], 0) / poly.length
  const r = poly.reduce((a, q) => a + Math.hypot(q[0] - cx, q[1] - cy), 0) / poly.length
  return { cx, cy, r }
}

function escalar(poly: [number, number][], f: number): [number, number][] {
  const { cx, cy } = centro(poly)
  return poly.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f])
}

/** Deterministic jitter: lake art must not consume the shared random stream. */
const jitter = (i: number, j: number) => {
  const h = Math.imul(i * 73856093 ^ j * 19349663, 2654435761) >>> 0
  return (h & 1023) / 1023
}

/** A lake: sandy shore, graded water, sepia wave strokes and the same double contour as the coast. */
function drawLake(ctx: CanvasRenderingContext2D, poly: [number, number][]) {
  const { cx, cy, r } = centro(poly)
  tracaSuave(ctx, escalar(poly, 1.14))
  ctx.fillStyle = 'rgba(216,197,154,0.5)'
  ctx.fill()
  tracaSuave(ctx, poly)
  const g = ctx.createRadialGradient(cx, cy, r * 0.12, cx, cy, r * 1.05)
  g.addColorStop(0, '#4F8AA2')
  g.addColorStop(0.65, '#6FA2B5')
  g.addColorStop(1, '#9CC3C9')
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  tracaSuave(ctx, poly)
  ctx.clip()
  ctx.strokeStyle = 'rgba(64,56,45,0.3)'
  ctx.lineWidth = 1.3
  ctx.lineCap = 'round'
  for (let y = cy - r; y < cy + r; y += 13) {
    for (let x = cx - r; x < cx + r; x += 17) {
      const jx = x + (jitter(x | 0, y | 0) - 0.5) * 9
      const jy = y + (jitter(y | 0, x | 0) - 0.5) * 6
      if (!dentroDoPoligono(jx, jy, escalar(poly, 0.8))) continue
      ctx.beginPath()
      ctx.moveTo(jx - 5, jy)
      ctx.quadraticCurveTo(jx - 2.5, jy - 3, jx, jy)
      ctx.quadraticCurveTo(jx + 2.5, jy + 3, jx + 5, jy)
      ctx.stroke()
    }
  }
  ctx.restore()
  tracaSuave(ctx, poly)
  ctx.strokeStyle = INK_HEX
  ctx.lineWidth = 2.4
  ctx.stroke()
  tracaSuave(ctx, escalar(poly, 1.07))
  ctx.strokeStyle = 'rgba(64,56,45,0.4)'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

/** Sepia style: lakes and rivers in ink on the parchment wash, no colour. */
export function desenharHidroClassico(ctx: CanvasRenderingContext2D, lagos: [number, number][][], rios: { x: number; y: number }[][]) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const pts of rios) {
    for (const pass of [0, 1]) {
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length
        const wd = 1.6 + 3.6 * t * t
        ctx.strokeStyle = pass === 0 ? INK_HEX : 'rgba(224,208,166,0.95)'
        ctx.lineWidth = pass === 0 ? wd + 1.8 : wd
        ctx.beginPath()
        ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y)
        ctx.lineTo(pts[i]!.x, pts[i]!.y)
        ctx.stroke()
      }
    }
  }
  for (const poly of lagos) {
    const { cx, cy, r } = centro(poly)
    tracaSuave(ctx, poly)
    ctx.fillStyle = 'rgba(200,184,142,0.55)'
    ctx.fill()
    ctx.save()
    tracaSuave(ctx, poly)
    ctx.clip()
    ctx.strokeStyle = 'rgba(64,56,45,0.35)'
    ctx.lineWidth = 1.2
    for (let y = cy - r; y < cy + r; y += 7) {
      ctx.beginPath()
      ctx.moveTo(cx - r, y)
      ctx.lineTo(cx + r, y)
      ctx.stroke()
    }
    ctx.restore()
    tracaSuave(ctx, poly)
    ctx.strokeStyle = INK_HEX
    ctx.lineWidth = 2.4
    ctx.stroke()
    tracaSuave(ctx, escalar(poly, 1.07))
    ctx.strokeStyle = 'rgba(64,56,45,0.4)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
}

export interface Glyph {
  x: number
  y: number
  tipo: 'montanha' | 'conifera' | 'arvore' | 'duna' | 'junco' | 'colina'
  /** Half-extent used for the clearance test, px. */
  tam: number
  draw: () => void
}

/**
 * Decides where every glyph goes. It consumes the random stream exactly like before, and glyphs
 * that would touch water are dropped only at the very end, so the rest of the map keeps its layout.
 */
export function planejarGlifos(
  { ctx, W, H, at, rnd, noise }: Pick<PaintCtx, 'W' | 'H' | 'at' | 'rnd' | 'noise'> & { ctx?: CanvasRenderingContext2D },
  field: Field,
  obst?: Obstaculos,
  zonas: Zona[] = B.zonas,
): Glyph[] {
  const ops: Glyph[] = []
  const step = 22
  for (let gy = 90; gy < H - 90; gy += step) {
    for (let gx = 90; gx < W - 90; gx += step) {
      const x = gx + (rnd() - 0.5) * step * 0.95
      const y = gy + (rnd() - 0.5) * step * 0.95
      const e = at(Math.round(x), Math.round(y))
      if (e < 0.08) continue
      const bi = field.best[(((y / S) | 0) * field.LW) + ((x / S) | 0)]!
      const zona = bi === 255 ? undefined : zonas[bi]
      const g = zona?.glifos ?? B.padrao.glifos
      const rock = hex(zona?.rocha ?? B.padrao.rocha)
      const tree = hex(zona?.arv ?? B.padrao.arv)
      const snow = zona?.neve === true
      const range = noise((x / W) * 5 + 30, (y / W) * 5 + 30)
      const wood = noise((x / W) * 6 + 60, (y / W) * 6)
      const r = rnd()
      const add = (tipo: Glyph['tipo'], tam: number, draw: () => void) => {
        if (!obst?.perto(x, y, 6 + tam * 0.8)) ops.push({ x, y, tipo, tam, draw })
      }

      if (g.montanha && range > (g.montanha >= 0.8 ? -0.3 : 0.2) && r < g.montanha * 0.7) {
        const s = 11 + rnd() * 10
        add('montanha', s, () => mountain(ctx!, x, y, s, rock, snow))
      } else if (g.conifera && rnd() < g.conifera * (wood > 0 ? 1 : 0.3)) {
        const s = 8 + rnd() * 4
        add('conifera', s, () => conifer(ctx!, x, y, s, tree))
      } else if (g.arvore && rnd() < g.arvore * (wood > -0.1 ? 1 : 0.35)) {
        const s = 6 + rnd() * 4
        add('arvore', s, () => roundTree(ctx!, x, y, s, tree))
      } else if (g.duna && rnd() < g.duna) {
        const s = 6 + rnd() * 5
        add('duna', s, () => dune(ctx!, x, y, s, rock))
      } else if (g.junco && rnd() < g.junco) {
        add('junco', 6, () => reed(ctx!, x, y))
      } else if (g.colina && rnd() < g.colina) {
        const s = 10 + rnd() * 6
        add('colina', s, () => hill(ctx!, x, y, s))
      }
    }
  }
  return ops
}

/** Prototype plan for Terrasen plus the feathered Terrasen weight (used to drop the default glyphs there). */
export interface ProtoPlano {
  plano: PlanoTerrasen
  pesoT: (x: number, y: number) => number
}

export function planoProto(p: Pick<PaintCtx, 'W' | 'H' | 'at' | 'noise'>, field: Field, zonas: Zona[], obst?: Obstaculos): ProtoPlano {
  const pesoT = criarPeso(field, zonas, ZONAS_TERRASEN)
  const pesoMont = criarPeso(field, zonas, (id) => id === ZONA_MONTANHAS)
  const plano = planejarTerrasen({ W: p.W, H: p.H, at: p.at, noise: p.noise, pesoT, pesoMont, obst })
  return { plano, pesoT }
}

/** Sepia path: same plan, weights come from the default zones. */
export function protoClassico(p: Pick<PaintCtx, 'W' | 'H' | 'at' | 'noise'>, obst?: Obstaculos): ProtoPlano {
  const zonas = aplicarPaleta(B.zonas)
  const field = buildField(p.W, p.H, p.noise, zonas)
  return planoProto(p, field, zonas, obst)
}

function drawGlyphs(p: PaintCtx, field: Field, obst: Obstaculos | undefined, zonas: Zona[], proto?: ProtoPlano) {
  const { ctx } = p
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  type Item = { x: number; y: number; draw: () => void }
  let itens: Item[] = planejarGlifos(p, field, obst, zonas)
  if (proto && p.proto) {
    const estilo = p.proto.estilo
    itens = filtrarForaDeTerrasen(itens, proto.pesoT)
    itens = [...itens, ...proto.plano.glifos.map((g) => ({ x: g.x, y: g.y, draw: () => desenharGlifoT(ctx, g, estilo, 'cor') }))]
  }
  // far-to-near so nearer glyphs overlap the ones behind them
  itens.sort((a, b) => a.y - b.y)
  for (const o of itens) o.draw()
}

function mountain(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rock: RGB, snow: boolean) {
  const top = { x: x - s * 0.1, y: y - s * 1.35 }
  // lit face
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(top.x, top.y)
  ctx.lineTo(x + s * 0.1, y)
  ctx.closePath()
  ctx.fillStyle = css(shade(rock, 0.3))
  ctx.fill()
  // shaded face
  ctx.beginPath()
  ctx.moveTo(top.x, top.y)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + s * 0.1, y)
  ctx.closePath()
  ctx.fillStyle = css(shade(rock, -0.22))
  ctx.fill()
  if (snow) {
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(x - s * 0.42, y - s * 0.78)
    ctx.lineTo(x - s * 0.22, y - s * 0.7)
    ctx.lineTo(x - s * 0.05, y - s * 0.82)
    ctx.lineTo(x + s * 0.18, y - s * 0.66)
    ctx.lineTo(x + s * 0.4, y - s * 0.78)
    ctx.closePath()
    ctx.fillStyle = '#EDF1EF'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(x + s * 0.4, y - s * 0.78)
    ctx.lineTo(x + s * 0.18, y - s * 0.66)
    ctx.lineTo(x - s * 0.05, y - s * 0.82)
    ctx.closePath()
    ctx.fillStyle = '#B8C9D0'
    ctx.fill()
  }
  ctx.strokeStyle = INK_HEX
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.lineTo(top.x, top.y)
  ctx.lineTo(x + s, y)
  ctx.stroke()
}

/** Top-view conifer: stacked triangles. */
function conifer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: RGB) {
  for (const [dy, k] of [
    [0, 1],
    [-s * 0.55, 0.72],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(x - s * 0.62 * k, y + dy)
    ctx.lineTo(x, y + dy - s * 1.1 * k)
    ctx.lineTo(x + s * 0.62 * k, y + dy)
    ctx.closePath()
    ctx.fillStyle = css(col, 0.95)
    ctx.fill()
    ctx.strokeStyle = css(INK, 0.8)
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

/** Top-view broadleaf tree: round crown with a soft shadow. */
function roundTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: RGB) {
  ctx.fillStyle = 'rgba(40,32,22,0.28)'
  ctx.beginPath()
  ctx.arc(x + s * 0.25, y + s * 0.3, s * 0.72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = css(col, 0.96)
  ctx.beginPath()
  ctx.arc(x, y, s * 0.72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = css(shade(col, 0.22), 0.7)
  ctx.beginPath()
  ctx.arc(x - s * 0.2, y - s * 0.22, s * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = css(INK, 0.75)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, s * 0.72, 0, Math.PI * 2)
  ctx.stroke()
}

function dune(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rock: RGB) {
  ctx.strokeStyle = css(shade(rock, -0.1), 0.7)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - s, y)
  ctx.quadraticCurveTo(x - s / 2, y - s * 0.7, x, y)
  ctx.quadraticCurveTo(x + s / 2, y + s * 0.7, x + s, y)
  ctx.stroke()
}

function reed(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = 'rgba(48,62,36,0.85)'
  ctx.lineWidth = 1.3
  for (const dx of [-3, 0, 3]) {
    ctx.beginPath()
    ctx.moveTo(x + dx, y + 4)
    ctx.lineTo(x + dx * 1.3, y - 5)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x - 6, y + 5)
  ctx.lineTo(x + 6, y + 5)
  ctx.stroke()
}

function hill(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.strokeStyle = css(INK, 0.6)
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(x, y, s, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
}
