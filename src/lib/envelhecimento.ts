/**
 * Single source of the "aged parchment" parameters (step 0b of docs/biomas/CONSOLIDACAO-TECNICA.md).
 *
 * Before this module the same numbers lived in three places: `terreno.ts` (sepia vignette), `colorir.ts` (colour vignette,
 * different radius and strength) and `biomas/papel-sepia.ts` (an analytic copy of the sepia one, used to tint the vector symbols).
 * The values below are EXACTLY the ones that were in the code; moving them must not change a single pixel (the browser suite
 * checks the SHA-256 of the full render and of the SVG text).
 *
 * Deliberately NOT here: the paper-integration levels of the vector layer (`PARAMS_PAPEL`, the grain mask) and any change of
 * texture, grain strength, mask or composition order. The colour-mode vector symbols do NOT get the vignette (approved decision).
 */

export type ModoEnvelhecimento = 'sepia' | 'cor'

export interface ParamsVinheta {
  /** Inner radius, as a fraction of the SHORT side of the map. */
  readonly r0: number
  /** Outer radius, as a fraction of the LONG side of the map. */
  readonly r1: number
  /** Gradient colour at the inner radius (alpha 0) and at the outer radius. */
  readonly de: readonly [number, number, number]
  readonly ate: readonly [number, number, number]
  /** Alpha at the outer radius. */
  readonly alfa: number
}

/** Edge vignette of each mode. The colour map is lighter so the colours stay readable. */
export const VINHETA: Readonly<Record<ModoEnvelhecimento, ParamsVinheta>> = {
  sepia: { r0: 0.35, r1: 0.72, de: [120, 80, 30], ate: [90, 52, 18], alfa: 0.55 },
  cor: { r0: 0.4, r1: 0.72, de: [120, 80, 30], ate: [90, 52, 18], alfa: 0.38 },
}

/** Per-pixel paper grain of the raster (the `(rnd() - 0.5) * k` amplitude): sepia 9, colour 8. */
export const GRAO_PIXEL: Readonly<Record<ModoEnvelhecimento, number>> = { sepia: 9, cor: 8 }

/** Warm tone the vector symbols are nudged towards in sepia, and the pale rim colour of the sepia conifers. */
export const TOM_QUENTE: readonly [number, number, number] = [150, 112, 64]
export const HALO_SEPIA: readonly [number, number, number] = [238, 226, 190]

/** Paints the vignette over the whole canvas (the last step of each raster painter). */
export function desenharVinheta(ctx: CanvasRenderingContext2D, W: number, H: number, modo: ModoEnvelhecimento) {
  const p = VINHETA[modo]
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * p.r0, W / 2, H / 2, Math.max(W, H) * p.r1)
  g.addColorStop(0, `rgba(${p.de[0]},${p.de[1]},${p.de[2]},0)`)
  g.addColorStop(1, `rgba(${p.ate[0]},${p.ate[1]},${p.ate[2]},${p.alfa})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/**
 * The same vignette as an analytic function: colour and alpha of the gradient at a point (what the canvas blends over
 * whatever is underneath). Colours are interpolated linearly and the alpha goes from 0 to `alfa`.
 * It can differ from the canvas by interpolation space and 8-bit rounding; `tests/navegador/envelhecimento.pw.ts` measures it.
 */
export function vinhetaEm(x: number, y: number, W: number, H: number, modo: ModoEnvelhecimento): { rgb: [number, number, number]; a: number } {
  const p = VINHETA[modo]
  const r0 = Math.min(W, H) * p.r0
  const r1 = Math.max(W, H) * p.r1
  const t = Math.min(1, Math.max(0, (Math.hypot(x - W / 2, y - H / 2) - r0) / (r1 - r0)))
  return {
    rgb: [p.de[0] + (p.ate[0] - p.de[0]) * t, p.de[1] + (p.ate[1] - p.de[1]) * t, p.de[2] + (p.ate[2] - p.de[2]) * t],
    a: p.alfa * t,
  }
}
