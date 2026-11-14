/**
 * EXPERIMENTAL vector layer for the Terrasen symbols. The SVG uses the same viewBox as the raster (MAP_W x MAP_H
 * pixels) and Leaflet gives the svgOverlay the SAME bounds as the image overlay, so both receive the same
 * transform and stay aligned at any zoom/pan. Glyphs come from the canvas drawing code through GravadorSvg.
 */
import { GravadorSvg } from './gravador-svg'
import { desenharGlifoT, type EstiloTerrasen, type ModoDesenho, type PlanoTerrasen } from './terrasen'

const NS = 'http://www.w3.org/2000/svg'

export function construirSvgTerrasen(plano: PlanoTerrasen, estilo: EstiloTerrasen, modo: ModoDesenho, W: number, H: number): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('xmlns', NS)
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  svg.dataset.modo = modo
  svg.setAttribute('aria-hidden', 'true')
  const partes: string[] = []
  // plan order is far-to-near (sorted by y), which is also the paint order
  plano.glifos.forEach((g, i) => {
    const gr = new GravadorSvg()
    desenharGlifoT(gr as unknown as CanvasRenderingContext2D, g, estilo, modo)
    partes.push(`<g data-i="${i}" data-x="${g.x.toFixed(1)}" data-y="${g.y.toFixed(1)}">${gr.elementos.join('')}</g>`)
  })
  svg.innerHTML = partes.join('')
  return svg
}
