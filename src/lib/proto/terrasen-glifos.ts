/**
 * Terrasen's symbol drawing code (conifers and mountains, styles A/B/C, colour and sepia), moved VERBATIM out of
 * terrasen.ts in step 0c.1. Nothing about the operations, the styles or the SVG serialisation changed: the only edits are
 * the parameter type (`GlifoBase`, which has every field these functions read) and the registration at the bottom.
 * The functions only use the canvas subset that GravadorSvg records.
 */
import { registrarGlifo, type Desenhista } from '../biomas/glifos'
import type { GlifoBase, ModoDesenho } from '../biomas/tipos'
import { PALETA_TERRASEN } from './terrasen-paleta'
import type { EstiloTerrasen } from './terrasen'

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
  /** Thin rim drawn under each tree so overlapping crowns keep a readable contour. */
  halo: string
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
        halo: 'rgba(14,30,28,0.62)',
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
        halo: 'rgba(238,226,190,0.8)',
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
function conifera(ctx: CanvasRenderingContext2D, g: GlifoBase, estilo: EstiloTerrasen, c: Cores) {
  const { x, y, tam: s } = g
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(g.rot)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (estilo === 'A') {
    // rim first: one silhouette (the three tiers) in the halo colour, slightly wider than the tree
    ctx.strokeStyle = c.halo
    ctx.fillStyle = c.halo
    ctx.lineWidth = 2.6
    for (let i = 0; i < 3; i++) {
      const w = s * (0.98 - 0.24 * i)
      const base = s * 0.15 - i * s * 0.52
      ctx.beginPath()
      ctx.moveTo(-w, base)
      ctx.lineTo(0, base - s * 0.95)
      ctx.lineTo(w, base)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
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
    ctx.strokeStyle = c.halo
    ctx.fillStyle = c.halo
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(-w, 0)
    ctx.lineTo(0, top)
    ctx.lineTo(w, 0)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
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

function montanha(ctx: CanvasRenderingContext2D, g: GlifoBase, estilo: EstiloTerrasen, c: Cores) {
  const { x, y, tam: s } = g
  const neve = g.neve
  ctx.save()
  ctx.translate(x, y)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = c.tinta
  /** `a` = apex offset as a fraction of w (default -0.1 keeps the original look); `nh` hatch lines; `wl` left-foot factor. */
  const cume = (cx: number, h: number, w: number, snow: boolean, hatch: boolean, a = -0.1, nh = 4, wl = 1) => {
    const ax = cx + w * a
    const bx = ax + w * 0.2
    const wr = w // right foot
    tri(ctx, cx - w * wl, 0, ax, -h, bx, 0, c.rochaLuz)
    tri(ctx, ax, -h, cx + wr, 0, bx, 0, c.rochaSombra)
    if (hatch) {
      ctx.strokeStyle = c.hachura
      ctx.lineWidth = 0.8
      const span = cx + wr - bx
      for (let i = 1; i <= nh; i++) {
        const t = i / (nh + 1)
        ctx.beginPath()
        ctx.moveTo(bx + span * 0.55 * t * 0.9, -h * (1 - t) + h * 0.05)
        ctx.lineTo(bx + span * 1.0 * t * 0.9, -h * (1 - t) * 0.5 - h * 0.05 + h * 0.2 * t)
        ctx.stroke()
      }
    }
    if (snow) {
      const k = 0.36
      ctx.beginPath()
      ctx.moveTo(ax, -h)
      ctx.lineTo(ax - w * k, -h * (1 - k * 1.1))
      ctx.lineTo(ax - w * k * 0.35, -h * (1 - k * 0.95))
      ctx.lineTo(ax + w * 0.08, -h * (1 - k * 1.15))
      ctx.lineTo(bx + w * 0.02, -h * (1 - k * 0.95))
      ctx.lineTo(ax + w * k, -h * (1 - k * 1.1))
      ctx.closePath()
      ctx.fillStyle = c.neve
      ctx.fill()
      tri(ctx, ax, -h, ax + w * k, -h * (1 - k * 1.1), bx + w * 0.02, -h * (1 - k * 0.95), c.neveSombra)
    }
    ctx.strokeStyle = c.tinta
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(cx - w * wl, 0)
    ctx.lineTo(ax, -h)
    ctx.lineTo(cx + wr, 0)
    ctx.stroke()
  }
  if (g.tipo === 'colina') {
    cume(0, s * 1.25, s * 0.8, false, false)
  } else if (estilo === 'A') {
    cume(s * 0.6, s * 0.95, s * 0.7, false, false)
    cume(-s * 0.1, s * 1.4, s * 1.0, neve, false)
  } else if (estilo === 'B') {
    // B: controlled variation driven by g.v (deterministic): proportion, lean, hatch density, and the
    // composition (main + both flanks / main + one flank / main + a low shoulder). Light always from the left.
    const v = g.v
    const q = (k: number) => {
      const s = Math.sin(v * 127.1 + k * 311.7) * 43758.5453
      return s - Math.floor(s) // deterministic 0..1 per facet
    }
    const comp = v < 0.4 ? 0 : v < 0.7 ? 1 : 2
    const wMain = s * (0.56 + 0.24 * q(1)) // slender .. broad
    const hMain = s * (1.22 + 0.34 * q(2)) // low .. tall
    const lean = -0.4 + 0.65 * q(3) // apex offset: leans left (-.4) or right (+.25)
    const nh = 3 + Math.floor(q(4) * 3)
    if (comp === 0) {
      cume(-s * (0.74 + 0.14 * q(5)), s * (0.66 + 0.2 * q(6)), s * (0.4 + 0.1 * q(7)), false, true, -0.1 + 0.2 * (q(8) - 0.5), 3)
      cume(s * (0.74 + 0.16 * q(9)), s * (0.8 + 0.2 * q(10)), s * (0.42 + 0.12 * q(11)), false, true, -0.1 + 0.3 * (q(12) - 0.5), 3)
      cume(0, hMain, wMain, neve, true, lean, nh)
    } else if (comp === 1) {
      const lado = q(13) < 0.5 ? -1 : 1
      cume(lado * s * (0.7 + 0.2 * q(14)), s * (0.7 + 0.25 * q(15)), s * (0.4 + 0.14 * q(16)), false, true, -0.1 + 0.3 * (q(17) - 0.5), 3)
      cume(-lado * s * 0.08, hMain, wMain * 1.08, neve, true, lean, nh)
    } else {
      cume(-s * 0.45, hMain * 0.72, wMain * 0.8, false, true, lean * 0.6, 3)
      cume(s * 0.35, hMain, wMain * 0.95, neve, true, lean, nh)
      cume(s * 1.0, s * 0.62, s * 0.36, false, false, -0.15, 3)
    }
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

const desenhaConifera: Desenhista = (ctx, g, estilo, modo) => conifera(ctx, g, estilo as EstiloTerrasen, cores(modo))
// hills ('colina') share the mountain drawing, which branches on `g.tipo` exactly as before
const desenhaMontanha: Desenhista = (ctx, g, estilo, modo) => montanha(ctx, g, estilo as EstiloTerrasen, cores(modo))

/** Registers Terrasen's symbol types in the glyph registry. Idempotent. */
export function registrarGlifosTerrasen(): void {
  registrarGlifo('conifera', desenhaConifera)
  registrarGlifo('montanha', desenhaMontanha)
  registrarGlifo('colina', desenhaMontanha)
}
