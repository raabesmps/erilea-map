import { describe, expect, it } from 'vitest'
import '../biomas/registro' // registers the glyph types of the registered biomes
import type { GlifoT } from './terrasen'
import { desenharGlifo } from '../biomas/glifos'
import { GravadorSvg } from '../biomas/gravador-svg'

const fnv = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619) >>> 0
  }
  return x.toString(16)
}

/** Records the drawing operations of a glyph as SVG text (the same recorder the vector layer uses). */
function gravar(g: GlifoT, estilo: 'A' | 'B' | 'C', modo: 'cor' | 'sepia') {
  const r = new GravadorSvg()
  desenharGlifo(r as unknown as CanvasRenderingContext2D, g, estilo, modo)
  return r.elementos.join('')
}

const amostras = (tipo: GlifoT['tipo']): GlifoT[] => {
  const out: GlifoT[] = []
  for (let i = 0; i < 12; i++) {
    out.push({ x: 100 + i * 7.3, y: 200 + i * 3.1, tipo, tam: 6 + i * 1.7, neve: tipo === 'montanha' && i % 2 === 0, rot: (i - 6) * 0.03, v: (i + 0.37) / 12, origem: 'nucleo' })
  }
  return out
}

/**
 * Hash and length of the SVG text recorded for 12 samples of each glyph, style and mode. FROZEN from the code of `e34b710`
 * BEFORE the glyph registry was introduced (step 0c.1): moving the drawing code must not change a single operation.
 * Style C mountains use clip(), which the recorder deliberately refuses (71 = the length of that error message).
 */
const CONGELADO: Record<string, [string, number]> = {
  'conifera A cor': ['bc07c537', 22633],
  'conifera A sepia': ['12397e25', 23761],
  'conifera B cor': ['f0712ef7', 16358],
  'conifera B sepia': ['3034822d', 16670],
  'conifera C cor': ['e12144a1', 12315],
  'conifera C sepia': ['60053689', 12627],
  'montanha A cor': ['e9837621', 8848],
  'montanha A sepia': ['4ad2a9d7', 9160],
  'montanha B cor': ['8388ac1b', 26497],
  'montanha B sepia': ['d35c1d11', 26810],
  'montanha C cor': ['bccdd11a', 71],
  'montanha C sepia': ['bccdd11a', 71],
  'colina A cor': ['fe3b56bf', 3809],
  'colina A sepia': ['6b1e0ddd', 3965],
  'colina B cor': ['fe3b56bf', 3809],
  'colina B sepia': ['6b1e0ddd', 3965],
  'colina C cor': ['fe3b56bf', 3809],
  'colina C sepia': ['6b1e0ddd', 3965],
}

describe('operações de desenho dos símbolos (A, B e C; cor e sépia)', () => {
  for (const tipo of ['conifera', 'montanha', 'colina'] as const)
    for (const estilo of ['A', 'B', 'C'] as const)
      for (const modo of ['cor', 'sepia'] as const) {
        it(`${tipo} ${estilo} ${modo}: idêntico ao congelado`, () => {
          let todos: string
          try {
            todos = amostras(tipo).map((g) => gravar(g, estilo, modo)).join('|')
          } catch (e) {
            todos = 'ERRO:' + (e as Error).message
          }
          expect([fnv(todos), todos.length]).toEqual(CONGELADO[`${tipo} ${estilo} ${modo}`])
        })
      }
})
