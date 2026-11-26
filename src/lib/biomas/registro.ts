/**
 * Registry of the refined biomes, in a FIXED order (step 0c.3). Terrasen is the first and, for now, the only real one.
 *
 * The order is the contract that protects what is already approved: biomes are planned one after the other over ONE shared
 * occupation grid, so a biome sees the symbols of the earlier ones as obstacles and never the other way round. Registering a
 * later biome therefore cannot move a single symbol of an earlier one (tests/R2). Nothing here uses the map's random stream.
 */
import type { ProtoTerrasen } from '../proto/terrasen'
import { TERRASEN } from '../proto/terrasen-bioma'
import { criarPeso } from './amostragem'
import type { BiomaRefinado, ParteZona, PlanoBioma } from './bioma'
import { criarOcupacao, type Ocupacao } from './ocupacao'
import type { ModoDesenho } from './tipos'
import type { EntradaBioma } from './bioma'

// the registry is the one place that knows every concrete biome; the contract is intentionally loose here
export type BiomaQualquer = BiomaRefinado<any, any>

/** Production registry: fixed order, Terrasen only. Adarlan is NOT registered. */
export const BIOMAS_REFINADOS: readonly BiomaQualquer[] = [TERRASEN]

/** A registered biome together with the configuration it was activated with (the URL parameters, for Terrasen). */
export interface BiomaAtivo {
  bioma: BiomaQualquer
  config: unknown
}

/**
 * Bridge from the existing URL-driven parameter (`?terrasen=`, a `ProtoTerrasen`) to the active biomes.
 * Terrasen is the only real biome, so this is the only parameter; the layers of step 0d will generalise it.
 */
export const ativosDeProto = (proto?: ProtoTerrasen): BiomaAtivo[] => (proto ? [{ bioma: TERRASEN, config: proto }] : [])

/** Problems of a registry: duplicated ids, a zone claimed by two biomes, a palette that touches a zone the biome does not own. */
export function validarRegistro(biomas: readonly BiomaQualquer[], zonaIds: readonly string[]): string[] {
  const problemas: string[] = []
  const ids = new Set<string>()
  for (const b of biomas) {
    if (ids.has(b.id)) problemas.push(`id repetido: ${b.id}`)
    ids.add(b.id)
  }
  for (const z of zonaIds) {
    const donos = biomas.filter((b) => b.zonas(z)).map((b) => b.id)
    if (donos.length > 1) problemas.push(`a zona ${z} pertence a mais de um bioma: ${donos.join(', ')}`)
  }
  for (const b of biomas) {
    for (const z of Object.keys(b.paleta)) if (!b.zonas(z)) problemas.push(`a paleta de ${b.id} altera ${z}, que não é uma zona dele`)
  }
  return problemas
}

/** Active biomas in registry order, whatever order they were given in. */
export function emOrdemDeRegistro(ativos: readonly BiomaAtivo[], registro: readonly BiomaQualquer[] = BIOMAS_REFINADOS): BiomaAtivo[] {
  const pos = (a: BiomaAtivo) => registro.findIndex((b) => b.id === a.bioma.id)
  for (const a of ativos) if (pos(a) < 0) throw new Error(`bioma fora do registro: ${a.bioma.id}`)
  return [...ativos].sort((a, b) => pos(a) - pos(b))
}

/** Applies the palette overrides of the active biomas to the zone list (zones of other biomas are returned untouched). */
export function aplicarPaletas<T extends { id: string; cor: string; arv?: string; rocha?: string }>(zonas: T[], ativos: readonly BiomaAtivo[]): T[] {
  const paleta: Record<string, ParteZona> = {}
  for (const a of ativos) Object.assign(paleta, a.bioma.paleta)
  return zonas.map((z) => (paleta[z.id] ? { ...z, ...paleta[z.id] } : z))
}

export interface EntradaPlanejamento {
  W: number
  H: number
  at: (x: number, y: number) => number
  noise: (x: number, y: number) => number
  obst?: EntradaBioma['obst']
  field: EntradaBioma['field']
  zonas: EntradaBioma['zonas']
  /** Occupation to start from (a new one by default). */
  ocupacao?: Ocupacao
}

export interface PlanoDeBioma {
  ativo: BiomaAtivo
  plano: PlanoBioma
  /** The biome's feathered weight, also used to replace the map's default symbols. */
  peso: (x: number, y: number) => number
}

export interface ResultadoPlanejamento {
  /** In registry order. */
  planos: PlanoDeBioma[]
  ocupacao: Ocupacao
}

/** Plans every active biome in registry order over one shared occupation grid. */
export function planejarBiomas(ativos: readonly BiomaAtivo[], e: EntradaPlanejamento, registro: readonly BiomaQualquer[] = BIOMAS_REFINADOS): ResultadoPlanejamento {
  const ocupacao = e.ocupacao ?? criarOcupacao()
  const planos: PlanoDeBioma[] = []
  for (const ativo of emOrdemDeRegistro(ativos, registro)) {
    const peso = criarPeso(e.field, e.zonas, ativo.bioma.zonas)
    const plano = ativo.bioma.planejar({ W: e.W, H: e.H, at: e.at, noise: e.noise, obst: e.obst, field: e.field, zonas: e.zonas, peso, ocupacao }, ativo.config) as PlanoBioma
    planos.push({ ativo, plano, peso })
  }
  return { planos, ocupacao }
}

/** Drops the map's default symbols that fall where an active biome draws its own (weight above `pesoSubstituicao`). */
export function filtrarSubstituidos<T extends { x: number; y: number }>(ops: T[], planos: readonly PlanoDeBioma[]): T[] {
  return ops.filter((o) => !planos.some((p) => p.peso(o.x, o.y) > p.ativo.bioma.pesoSubstituicao))
}

/** True where an active biome replaces the default symbols (the sepia painter's `omitir`). */
export function substituidoEm(x: number, y: number, planos: readonly PlanoDeBioma[]): boolean {
  return planos.some((p) => p.peso(x, y) > p.ativo.bioma.pesoSubstituicao)
}

/** Paints each active biome's background washes, in registry order. */
export function desenharFundos(ctx: CanvasRenderingContext2D, planos: readonly PlanoDeBioma[], modo: ModoDesenho): void {
  for (const p of planos) p.ativo.bioma.desenharFundo?.(ctx, p.plano, modo, p.ativo.config)
}

// make sure every registered biome's symbol types are in the glyph registry before anything draws them
for (const b of BIOMAS_REFINADOS) b.registrarGlifos()
