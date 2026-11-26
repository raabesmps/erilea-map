/** Types shared by every refined biome (step 0c of docs/biomas/CONSOLIDACAO-TECNICA.md). */

/** Colour map or sepia map. */
export type ModoDesenho = 'cor' | 'sepia'

/**
 * What the glyph registry needs to draw a symbol. Each biome extends it with what only it needs
 * (Terrasen adds `origem`); the drawing functions read only these fields.
 */
export interface GlifoBase {
  x: number
  y: number
  /** Key of the glyph registry (see glifos.ts). */
  tipo: string
  /** Size in px. */
  tam: number
  neve: boolean
  rot: number
  /** Deterministic 0..1 value that varies the drawing of this one symbol. */
  v: number
}
