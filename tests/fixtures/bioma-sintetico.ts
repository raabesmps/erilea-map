/**
 * SYNTHETIC biome, for tests only (R2, R8). It is never registered in production: Adarlan does not exist yet and the production
 * registry holds Terrasen alone. It tries to fill the SAME window Terrasen uses, ignoring its own zone weight on purpose, so that
 * the two biomes compete for space (occupation) and their symbols interleave in the painting order.
 */
import { criarAceitador } from '../../src/lib/biomas/aceitador'
import { candidatosPorPrioridade } from '../../src/lib/biomas/amostragem'
import type { BiomaRefinado, PlanoBioma } from '../../src/lib/biomas/bioma'
import { registrarGlifo } from '../../src/lib/biomas/glifos'
import type { GlifoBase } from '../../src/lib/biomas/tipos'

export const TIPO_SINTETICO = 'sintetico-teste'

/** A small diamond with a dark outline, using only the canvas subset the SVG recorder understands. */
function desenhar(ctx: CanvasRenderingContext2D, g: GlifoBase, _estilo: string, modo: 'cor' | 'sepia') {
  const s = g.tam
  ctx.beginPath()
  ctx.moveTo(g.x, g.y - s)
  ctx.lineTo(g.x + s * 0.7, g.y)
  ctx.lineTo(g.x, g.y + s * 0.5)
  ctx.lineTo(g.x - s * 0.7, g.y)
  ctx.closePath()
  ctx.fillStyle = modo === 'cor' ? '#d9822b' : '#8a5a2b'
  ctx.fill()
  ctx.strokeStyle = '#2a1a0a'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

export interface ConfigSintetico {
  vetorial?: boolean
}

export const SINTETICO: BiomaRefinado<ConfigSintetico, PlanoBioma> = {
  id: 'sintetico',
  zonas: (id) => id.startsWith('r05-'),
  paleta: {},
  pesoSubstituicao: 0.12,
  planejar(e) {
    const ac = criarAceitador<GlifoBase>({ W: e.W, H: e.H, at: e.at, peso: () => 1, pesoMin: 0.12, obst: e.obst, folgaIcone: 30, margemRota: 13, ocupacao: e.ocupacao })
    for (const c of candidatosPorPrioridade(0.5 * e.W, 0, 0.92 * e.W, 0.32 * e.H, 12)) ac.tentar({ x: c.x, y: c.y, tipo: TIPO_SINTETICO, tam: 8, neve: false, rot: 0, v: 0 }, 10, 14)
    return { glifos: ac.glifos }
  },
  estilo: () => 'A',
  vetorial: (config) => config.vetorial === true,
  registrarGlifos: () => registrarGlifo(TIPO_SINTETICO, desenhar),
  parametroUrl: 'sintetico',
  configDaUrl: (valor, { vetor }) => (valor === '1' ? { vetorial: vetor } : null),
}
