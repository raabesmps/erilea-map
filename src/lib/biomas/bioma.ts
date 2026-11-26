/**
 * Contract of a refined biome (step 0c.3 of docs/biomas/CONSOLIDACAO-TECNICA.md). It only holds what the raster painters and
 * the registry need today; it grows when a second REAL biome needs more, never before.
 */
import type { Obstaculos } from '../hidrografia'
import type { GlifoBase, ModoDesenho } from './tipos'
import type { Ocupacao } from './ocupacao'

/** Palette override of one zone of biomas.json (applied before the biome field is built). */
export interface ParteZona {
  cor?: string
  arv?: string
  rocha?: string
}

/** What `planejar` receives: the terrain, the biome field and the occupation shared by every biome of the run. */
export interface EntradaBioma {
  W: number
  H: number
  at: (x: number, y: number) => number
  noise: (x: number, y: number) => number
  obst?: Obstaculos
  /** Biome field and zone list (with the palettes already applied), as built by `buildField`. */
  field: { best: Uint8Array; LW: number }
  zonas: { id: string }[]
  /** Feathered weight of THIS biome's zones (see `criarPeso`). */
  peso: (x: number, y: number) => number
  /** Occupation grid shared by all biomes: an earlier biome's symbols are obstacles for the later ones. */
  ocupacao: Ocupacao
}

export interface PlanoBioma {
  /** Planned symbols, in the order they are painted (far to near). */
  glifos: GlifoBase[]
}

export interface BiomaRefinado<C = unknown, P extends PlanoBioma = PlanoBioma> {
  id: string
  /** The zones of biomas.json that belong to this biome. A zone belongs to at most one biome. */
  zonas: (zonaId: string) => boolean
  /** Palette override; its keys must be zones owned by this biome. */
  paleta: Readonly<Record<string, ParteZona>>
  /** Where the weight is above this, the map's default symbols are replaced by this biome's (0.12 for Terrasen). */
  pesoSubstituicao: number
  /** Plans the symbols. Deterministic, and it must NOT use the map's shared random stream. */
  planejar(e: EntradaBioma, config: C): P
  /** Soft washes painted under the symbols and over the terrain (optional). */
  desenharFundo?(ctx: CanvasRenderingContext2D, plano: P, modo: ModoDesenho, config: C): void
  /** Symbol style for a map mode. */
  estilo(modo: ModoDesenho, config: C): string
  /** True when the symbols are drawn by the vector layer instead of the raster. */
  vetorial(config: C): boolean
  /** Registers the symbol types of this biome in the glyph registry (idempotent). */
  registrarGlifos(): void
  /** Name of the URL parameter that activates this biome (`terrasen` for Terrasen). */
  parametroUrl: string
  /** Configuration for a URL value, or null when the value does not activate the biome. `vetor`: symbols drawn by the SVG layer. */
  configDaUrl(valor: string, opcoes: { vetor: boolean }): C | null
}
