/**
 * SPIKE (throwaway, not part of the app): can a vector layer of Terrasen glyphs stay in sync with
 * the raster in Leaflet during zoom, pan and the colour/sepia switch?
 *
 * Strategy under test: an L.svgOverlay with EXACTLY the same bounds as the image overlay, filled
 * with the glyphs recorded from the real canvas drawing code. Open /spikes/vetorial/index.html
 * in `npm run dev`; window.__spike exposes everything the measurement script needs.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import biomas from '../../src/data/biomas.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from '../../src/lib/geografia'
import { buildField } from '../../src/lib/colorir'
import { ativos, criarObstaculos, lagoPoligono, rioPontos } from '../../src/lib/hidrografia'
import { renderTerrain } from '../../src/lib/terreno'
import { aplicarPaleta, criarPeso, desenharGlifoT, planejarTerrasen, ZONA_MONTANHAS, ZONAS_TERRASEN, type EstiloTerrasen, type ModoDesenho } from '../../src/lib/proto/terrasen'
import { GravadorSvg } from './gravador-svg'

const NS = 'http://www.w3.org/2000/svg'
const map = L.map('map', { crs: L.CRS.Simple, minZoom: -2, maxZoom: 1.5, zoomSnap: 0.25, zoomDelta: 0.5, zoomControl: false, attributionControl: false })
const bounds = L.latLngBounds([0, 0], [MAP_H, MAP_W])
map.fitBounds(bounds, { animate: false })

// ---- the same plan the prototype uses ----
const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
const zonas = aplicarPaleta(biomas.zonas as { id: string; cor: string }[])
const campo = buildField(MAP_W, MAP_H, ruido, zonas as never)
const pesoT = criarPeso(campo, zonas, ZONAS_TERRASEN)
const pesoMont = criarPeso(campo, zonas, (id) => id === ZONA_MONTANHAS)
const hidro = ativos('alta')
const obst = criarObstaculos(hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H)), hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at)))
const plano = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })

// ---- raster, one overlay per mode, both kept decoded ----
const proto = { estilo: 'A' as EstiloTerrasen, estiloSepia: 'B' as EstiloTerrasen }
const t0 = performance.now()
const url = {
  cor: renderTerrain(MAP_W, MAP_H, 11, 'colorido', 'v3', 'alta', proto).toDataURL('image/jpeg', 0.92),
  sepia: renderTerrain(MAP_W, MAP_H, 11, 'classico', 'v3', 'alta', proto).toDataURL('image/jpeg', 0.92),
}
const msRaster = performance.now() - t0
const rasters = {
  cor: L.imageOverlay(url.cor, bounds).addTo(map),
  sepia: L.imageOverlay(url.sepia, bounds).addTo(map),
}
rasters.sepia.getElement()!.style.visibility = 'hidden'

// ---- vector layer: glyphs recorded from the real canvas code ----
function construirSvg(modo: ModoDesenho, marcadores: boolean): SVGSVGElement {
  const estilo = modo === 'cor' ? proto.estilo : proto.estiloSepia
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('xmlns', NS)
  svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`)
  svg.dataset.modo = modo
  const partes: string[] = []
  plano.glifos.forEach((g, i) => {
    const gr = new GravadorSvg()
    desenharGlifoT(gr as unknown as CanvasRenderingContext2D, g, estilo, modo)
    partes.push(`<g data-i="${i}">${gr.elementos.join('')}${marcadores ? `<circle data-g="${i}" cx="${g.x}" cy="${g.y}" r="0.6" fill="none"/>` : ''}</g>`)
  })
  svg.innerHTML = partes.join('')
  return svg
}
const svgs = { cor: construirSvg('cor', true), sepia: construirSvg('sepia', true) }
const vetor = {
  cor: L.svgOverlay(svgs.cor, bounds, { interactive: false }).addTo(map),
  sepia: L.svgOverlay(svgs.sepia, bounds, { interactive: false }).addTo(map),
}
vetor.sepia.getElement()!.style.visibility = 'hidden'

// a route-like polyline added AFTER the overlays, to check stacking order
const rota = L.polyline([[(1 - 0.157) * MAP_H, 0.62 * MAP_W], [(1 - 0.2) * MAP_H, 0.7 * MAP_W]], { color: '#7a2e2b', weight: 3 }).addTo(map)

let modoAtual: ModoDesenho = 'cor'
const esperar = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Strategy 1 (naive): swap the image url and the svg content in one task. */
async function trocarNaive(modo: ModoDesenho) {
  const t = performance.now()
  const img = rasters.cor.getElement() as HTMLImageElement
  const carregou = new Promise<number>((r) => img.addEventListener('load', () => r(performance.now() - t), { once: true }))
  rasters.cor.setUrl(modo === 'cor' ? url.cor : url.sepia)
  vetor.cor.getElement()!.replaceChildren(...Array.from(svgs[modo].childNodes).map((n) => n.cloneNode(true)))
  vetor.cor.getElement()!.dataset.modo = modo
  modoAtual = modo
  return carregou
}

/** Strategy 2 (preload + visibility): both versions stay decoded; one frame flips both. */
async function trocarPreload(modo: ModoDesenho) {
  await Promise.all([(rasters.cor.getElement() as HTMLImageElement).decode(), (rasters.sepia.getElement() as HTMLImageElement).decode()])
  await esperar()
  const mostrar = modo
  const esconder = modo === 'cor' ? 'sepia' : 'cor'
  rasters[mostrar].getElement()!.style.visibility = 'visible'
  vetor[mostrar].getElement()!.style.visibility = 'visible'
  rasters[esconder].getElement()!.style.visibility = 'hidden'
  vetor[esconder].getElement()!.style.visibility = 'hidden'
  modoAtual = modo
}

;(window as unknown as Record<string, unknown>).__spike = {
  L,
  map,
  rasters,
  vetor,
  rota,
  plano,
  MAP_W,
  MAP_H,
  msRaster,
  trocarNaive,
  trocarPreload,
  modo: () => modoAtual,
  pronto: true,
}
