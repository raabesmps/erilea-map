/**
 * EXPERIMENTAL: integrates the vector symbols with the aged sepia parchment WITHOUT rasterising them.
 * Three vector-native ingredients, all keeping the outlines, faces and hatching as real paths:
 *  1. the same edge vignette the raster gets (envelhecimento.ts), applied analytically to each glyph's colours;
 *  2. a slight warm shift of the colours and a softer halo (the vector halo is crisper than the blurred raster one);
 *  3. an ink-absorption effect: root opacity plus a tiled paper-grain alpha mask (CSS mask, GPU-composited,
 *     scales with the map because its size is a percentage of the element).
 * Level 0 = none (the round-3 look). 1 = subtle. 2 = a little more noticeable, still discreet.
 */
import { mulberry32 } from '../geografia'
import { HALO_SEPIA, TOM_QUENTE, vinhetaEm } from '../envelhecimento'

export type NivelPapel = 0 | 1 | 2

export interface ParamsPapel {
  opacidade: number
  quente: number
  halo: number
  graoAmp: number
}

export const PARAMS_PAPEL: Record<1 | 2, ParamsPapel> = {
  1: { opacidade: 0.98, quente: 0.03, halo: 0.4, graoAmp: 0.07 },
  2: { opacidade: 0.95, quente: 0.07, halo: 0.25, graoAmp: 0.16 },
}

type RGBA = [number, number, number, number]

export function lerCor(css: string): RGBA | null {
  const h = /^#([0-9a-f]{6})$/i.exec(css)
  if (h) {
    const n = parseInt(h[1]!, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(css)
  if (m) {
    const p = m[1]!.split(',').map((s) => parseFloat(s))
    if (p.length >= 3 && p.every((v) => !Number.isNaN(v))) return [p[0]!, p[1]!, p[2]!, p[3] ?? 1]
  }
  return null
}

/** Colour transform for the glyph at (x, y): vignette, warm shift, softer halo. */
export function transformarCor(nivel: 1 | 2, x: number, y: number, W: number, H: number): (css: string) => string {
  const P = PARAMS_PAPEL[nivel]
  const v = vinhetaEm(x, y, W, H, 'sepia')
  return (css) => {
    const c = lerCor(css)
    if (!c) return css
    const ehHalo = c[0] === HALO_SEPIA[0] && c[1] === HALO_SEPIA[1] && c[2] === HALO_SEPIA[2]
    const rgb: [number, number, number] = [c[0], c[1], c[2]]
    for (let i = 0; i < 3; i++) {
      let k = rgb[i]!
      k = k * (1 - P.quente) + TOM_QUENTE[i]! * P.quente
      k = k * (1 - v.a) + v.rgb[i]! * v.a
      rgb[i] = Math.round(k)
    }
    const a = ehHalo ? c[3] * P.halo : c[3]
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.round(a * 1000) / 1000})`
  }
}

/** Tileable value noise (periodic lattice), 0..1. */
function ruidoPeriodico(n: number, rnd: () => number) {
  const g = Array.from({ length: n * n }, () => rnd())
  return (u: number, v: number) => {
    const x = u * n
    const y = v * n
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const at = (i: number, j: number) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)]!
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
    return a + (b - a) * sy
  }
}

/** Alpha for the grain tile at (u, v) in 0..1 (pure, testable): 1 = full ink, lower = paper shows through. */
export function alfaGrao(nivel: 1 | 2, fino: number, medio: number, mancha: number): number {
  const n = 0.5 * fino + 0.3 * medio + 0.2 * mancha
  const s = Math.min(1, Math.max(0, (n - 0.25) / 0.5)) // spread the middle of the distribution
  return 1 - PARAMS_PAPEL[nivel].graoAmp * s
}

const cacheTextura: Partial<Record<1 | 2, string>> = {}

/** PNG data URL of a 192 px tileable paper-grain alpha mask (browser only). */
export function texturaGrao(nivel: 1 | 2): string {
  const hit = cacheTextura[nivel]
  if (hit) return hit
  const N = 192
  const rnd = mulberry32(7)
  const fino = ruidoPeriodico(96, rnd)
  const medio = ruidoPeriodico(24, rnd)
  const mancha = ruidoPeriodico(6, rnd)
  const cv = document.createElement('canvas')
  cv.width = N
  cv.height = N
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(N, N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = x / N
      const v = y / N
      const a = alfaGrao(nivel, fino(u, v), medio(u, v), mancha(u, v))
      const i = (y * N + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.round(a * 255)
    }
  ctx.putImageData(img, 0, 0)
  return (cacheTextura[nivel] = cv.toDataURL('image/png'))
}

/** Applies the root-level ink effect (opacity + grain mask) to the SVG element. Outlines stay vector. */
export function aplicarTintaNoSvg(svg: SVGSVGElement, nivel: 1 | 2) {
  const P = PARAMS_PAPEL[nivel]
  svg.style.opacity = String(P.opacidade)
  const url = `url("${texturaGrao(nivel)}")`
  const s = svg.style as CSSStyleDeclaration & { webkitMaskImage?: string; webkitMaskSize?: string }
  for (const pre of ['', 'webkit']) {
    const k = (p: string) => (pre ? `${pre}${p[0]!.toUpperCase()}${p.slice(1)}` : p)
    ;(s as unknown as Record<string, string>)[k('maskImage')] = url
    ;(s as unknown as Record<string, string>)[k('maskSize')] = '5% auto' // a tile spans 5% of the map width, so it scales with zoom
    ;(s as unknown as Record<string, string>)[k('maskRepeat')] = 'repeat'
  }
}
