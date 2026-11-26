/**
 * Vector layer for the symbols of the refined biomes (step 0d.1): ONE SVG per mode with the symbols of ALL biomes whose
 * symbols are drawn by the vector layer. The SVG has the same viewBox as the raster (MAP_W x MAP_H pixels) and Leaflet gives
 * the svgOverlay the SAME bounds as the image overlay, so both receive the same transform and stay aligned at any zoom/pan.
 * Glyphs come from the canvas drawing code through GravadorSvg. In sepia, `papel` (1 or 2) integrates the symbols with the
 * aged parchment, see papel-sepia.ts.
 *
 * Painting order (global, deterministic): ascending `y` (far to near) over the symbols of ALL biomes together, so symbols of
 * different biomes interleave. Ties are broken by the biome's position in the registry and then by the symbol's position in
 * its own plan. With Terrasen alone this is exactly Terrasen's own plan order.
 *
 * Each symbol is its own `<g>` carrying `data-bioma`. That attribute is added to the DOM AFTER the markup is parsed, and
 * `textoDeReferencia` removes it again, so the textual reference of the Terrasen SVG (the master hash) does not change:
 * the proof of equivalence is that the text without `data-bioma` is the text of the original.
 */
import { desenharGlifo } from './glifos'
import { GravadorSvg } from './gravador-svg'
import { aplicarTintaNoSvg, transformarCor, type NivelPapel } from './papel-sepia'
import type { GlifoBase, ModoDesenho } from './tipos'
import type { PlanoDeBioma } from './registro'
import './registro' // registers every registered biome's glyph types

const NS = 'http://www.w3.org/2000/svg'

/** A symbol ready to be painted, with the biome it belongs to and the style that biome uses in this mode. */
export interface SimboloOrdenado {
  g: GlifoBase
  bioma: string
  estilo: string
  /** Position in the global painting order. */
  i: number
}

/** The biomes whose symbols this layer draws (the others are drawn by the raster). */
const desenhadosPeloVetor = (planos: readonly PlanoDeBioma[]) => planos.filter((p) => p.ativo.bioma.vetorial(p.ativo.config))

/** Global painting order over all vector biomes: y ascending, then registry order, then the biome's own plan order. */
export function ordenarParaPintura(planos: readonly PlanoDeBioma[], modo: ModoDesenho): SimboloOrdenado[] {
  const entradas = desenhadosPeloVetor(planos).flatMap((p, ib) => {
    const estilo = p.ativo.bioma.estilo(modo, p.ativo.config)
    return p.plano.glifos.map((g, ig) => ({ g, bioma: p.ativo.bioma.id, estilo, ib, ig }))
  })
  entradas.sort((a, b) => a.g.y - b.g.y || a.ib - b.ib || a.ig - b.ig)
  return entradas.map((e, i) => ({ g: e.g, bioma: e.bioma, estilo: e.estilo, i }))
}

/** The `<g>` markup of every symbol, in painting order. Pure (no DOM): the recorder and the colour transform are plain code. */
export function partesSvg(simbolos: readonly SimboloOrdenado[], modo: ModoDesenho, W: number, H: number, papel: NivelPapel = 0): string[] {
  const integrar = modo === 'sepia' && papel > 0
  return simbolos.map(({ g, estilo, i }) => {
    const gr = new GravadorSvg(integrar ? transformarCor(papel as 1 | 2, g.x, g.y, W, H) : undefined)
    desenharGlifo(gr as unknown as CanvasRenderingContext2D, g, estilo, modo)
    return `<g data-i="${i}" data-x="${g.x.toFixed(1)}" data-y="${g.y.toFixed(1)}">${gr.elementos.join('')}</g>`
  })
}

export function construirSvgBiomas(planos: readonly PlanoDeBioma[], modo: ModoDesenho, W: number, H: number, papel: NivelPapel = 0): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('xmlns', NS)
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.dataset.modo = modo
  svg.setAttribute('aria-hidden', 'true')
  const simbolos = ordenarParaPintura(planos, modo)
  svg.innerHTML = partesSvg(simbolos, modo, W, H, papel).join('')
  // identification AFTER parsing: the markup above (and so the reference text) never contains data-bioma
  simbolos.forEach((s, k) => svg.children[k]!.setAttribute('data-bioma', s.bioma))
  if (modo === 'sepia' && papel > 0) aplicarTintaNoSvg(svg, papel as 1 | 2)
  return svg
}

/** The serialisation WITHOUT the biome identification: what the master hash of the SVG is computed from. */
export const textoDeReferencia = (svg: SVGSVGElement): string => svg.outerHTML.replace(/ data-bioma="[^"]*"/g, '')
