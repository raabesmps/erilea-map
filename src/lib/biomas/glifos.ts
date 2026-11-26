/**
 * Glyph registry: maps a symbol type (`conifera`, `montanha`, ...) to the function that draws it.
 * The drawing functions only use the canvas subset that GravadorSvg can record, so the same code serves the raster
 * and the vector layer. Registering the same type twice with a DIFFERENT function is an error (a silent override
 * would change how an approved biome looks); registering the same function again is harmless.
 */
import type { GlifoBase, ModoDesenho } from './tipos'

export type Desenhista = (ctx: CanvasRenderingContext2D, g: GlifoBase, estilo: string, modo: ModoDesenho) => void

const REGISTRO = new Map<string, Desenhista>()

export function registrarGlifo(tipo: string, desenhista: Desenhista): void {
  const atual = REGISTRO.get(tipo)
  if (atual && atual !== desenhista) throw new Error(`o símbolo "${tipo}" já tem outro desenhista registrado`)
  REGISTRO.set(tipo, desenhista)
}

/** Registered symbol types, sorted (for diagnostics and tests). */
export function glifosRegistrados(): string[] {
  return [...REGISTRO.keys()].sort()
}

export function desenharGlifo(ctx: CanvasRenderingContext2D, g: GlifoBase, estilo: string, modo: ModoDesenho): void {
  const d = REGISTRO.get(g.tipo)
  if (!d) throw new Error(`símbolo sem desenhista registrado: "${g.tipo}"`)
  d(ctx, g, estilo, modo)
}
