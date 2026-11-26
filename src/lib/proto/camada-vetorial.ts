/**
 * EXPERIMENTAL vector layer for the Terrasen symbols. The SVG uses the same viewBox as the raster (MAP_W x MAP_H
 * pixels) and Leaflet gives the svgOverlay the SAME bounds as the image overlay, so both receive the same
 * transform and stay aligned at any zoom/pan. Glyphs come from the canvas drawing code through GravadorSvg.
 * In sepia, `papel` (1 or 2) integrates the symbols with the aged parchment, see papel-sepia.ts.
 */
import { GravadorSvg } from './gravador-svg'
import { aplicarTintaNoSvg, transformarCor, type NivelPapel } from './papel-sepia'
import { desenharGlifo } from '../biomas/glifos'
import type { ModoDesenho } from '../biomas/tipos'
import '../biomas/registro' // registers every registered biome's glyph types
import type { EstiloTerrasen, PlanoTerrasen } from './terrasen'

const NS = 'http://www.w3.org/2000/svg'

export function construirSvgTerrasen(plano: PlanoTerrasen, estilo: EstiloTerrasen, modo: ModoDesenho, W: number, H: number, papel: NivelPapel = 0): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('xmlns', NS)
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.dataset.modo = modo
  svg.setAttribute('aria-hidden', 'true')
  const integrar = modo === 'sepia' && papel > 0
  const partes: string[] = []
  // plan order is far-to-near (sorted by y), which is also the paint order
  plano.glifos.forEach((g, i) => {
    const gr = new GravadorSvg(integrar ? transformarCor(papel as 1 | 2, g.x, g.y, W, H) : undefined)
    desenharGlifo(gr as unknown as CanvasRenderingContext2D, g, estilo, modo)
    partes.push(`<g data-i="${i}" data-x="${g.x.toFixed(1)}" data-y="${g.y.toFixed(1)}">${gr.elementos.join('')}</g>`)
  })
  svg.innerHTML = partes.join('')
  if (integrar) aplicarTintaNoSvg(svg, papel as 1 | 2)
  return svg
}
