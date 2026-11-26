/**
 * Acceptor: the common acceptance test every symbol of a biome goes through (extracted VERBATIM from
 * `tentar` in proto/terrasen.ts in step 0c.2). The ORDER of the checks and every limit are unchanged:
 *   1. inside the map (x ≥ 8, y ≥ 8, x ≤ W − 8; there is deliberately no bottom check: the land test below covers it)
 *   2. land (elevation ≥ 0.08)
 *   3. inside the biome (feathered zone weight ≥ `pesoMin`)
 *   4. clear of place icons (`folgaIcone`) and of the label rectangle under each icon
 *   5. clear of lakes and rivers (`margem` + 0.8 · size)
 *   6. clear of the journey routes (`margemRota` + 0.3 · size)
 *   7. spacing against everything already taken (shared `Ocupacao`)
 * Only when all pass is the symbol recorded (in the occupation grid and in `glifos`). Nothing here uses randomness.
 */
import lugaresJson from '../../data/lugares.json'
import rotasJson from '../../data/rotas.json'
import type { Place, Route } from '../../types'
import { distanciaAoCurso, type Obstaculos } from '../hidrografia'
import { criarOcupacao, type Ocupacao } from './ocupacao'

const PINS = (lugaresJson as Place[]).map((p) => ({ x: p.x, y: p.y }))
const ROTAS = (rotasJson as Route[]).map((r) => r.pontos)

export interface EntradaAceitador {
  W: number
  H: number
  at: (x: number, y: number) => number
  /** Feathered weight of the biome at a point (0..1). */
  peso: (x: number, y: number) => number
  /** Minimum weight to be inside the biome (0.12 for Terrasen). */
  pesoMin: number
  obst?: Obstaculos
  /** Clearance (px) around place icons. */
  folgaIcone: number
  /** Clearance (px) from the journey routes. */
  margemRota: number
  /** Occupation to share with other biomes of the same planning run; a new one by default. */
  ocupacao?: Ocupacao
}

export interface Aceitador<G extends { x: number; y: number; tam: number }> {
  /** Accepts the symbol (recording it) or refuses it. `r` is its spacing radius, `margem` its water clearance. */
  tentar(g: G, r: number, margem: number): boolean
  /** Accepted symbols, in acceptance order (the planner may sort it in place afterwards). */
  glifos: G[]
  ocupacao: Ocupacao
  /** Place icons and routes in pixels, for planner steps that need them. */
  pinsPx: { x: number; y: number }[]
}

export function criarAceitador<G extends { x: number; y: number; tam: number }>(e: EntradaAceitador): Aceitador<G> {
  const { W, H, at, peso, pesoMin, obst } = e
  const ocupacao = e.ocupacao ?? criarOcupacao()
  const pinsPx = PINS.map((p) => ({ x: p.x * W, y: p.y * H }))
  const rotasPx = ROTAS.map((r) => r.map(([x, y]) => ({ x: x * W, y: y * H })))
  const glifos: G[] = []
  const tentar = (g: G, r: number, margem: number): boolean => {
    const { x, y } = g
    if (x < 8 || y < 8 || x > W - 8) return false
    if (at(Math.round(x), Math.round(y)) < 0.08) return false
    if (peso(x, y) < pesoMin) return false
    for (const p of pinsPx) {
      if (Math.hypot(p.x - x, p.y - y) < e.folgaIcone) return false
      // the label sits right under the icon
      if (Math.abs(x - p.x) < 52 && y > p.y + 6 && y < p.y + 38) return false
    }
    if (obst?.perto(x, y, margem + g.tam * 0.8)) return false
    for (const rota of rotasPx) if (distanciaAoCurso(x, y, rota) < e.margemRota + g.tam * 0.3) return false
    if (!ocupacao.livre(x, y, r)) return false
    ocupacao.ocupar(x, y, r)
    glifos.push(g)
    return true
  }
  return { tentar, glifos, ocupacao, pinsPx }
}
