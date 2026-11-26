/** Test helper: plans the active biomes over the approved seed-11 terrain exactly the way the painters do. */
import biomas from '../../src/data/biomas.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from '../../src/lib/geografia'
import { buildField, tracarRios } from '../../src/lib/colorir'
import { ativos as hidroAtiva, criarObstaculos, lagoPoligono, rioPontos } from '../../src/lib/hidrografia'
import { aplicarPaletas, BIOMAS_REFINADOS, planejarBiomas, type BiomaAtivo, type BiomaQualquer } from '../../src/lib/biomas/registro'

const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
export const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
export const ruidoMapa = ruido
const hidro = hidroAtiva('alta')
export const obst = criarObstaculos(
  hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H)),
  [...tracarRios({ W: MAP_W, H: MAP_H, at, noise: ruido }, hidro.substituidos).map((r) => r.pts), ...hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))],
)

export function planejarTeste(ativos: BiomaAtivo[], registro: readonly BiomaQualquer[] = BIOMAS_REFINADOS) {
  const zonas = aplicarPaletas(biomas.zonas as never[], ativos) as never[]
  const field = buildField(MAP_W, MAP_H, ruido, zonas)
  return planejarBiomas(ativos, { W: MAP_W, H: MAP_H, at, noise: ruido, obst, field, zonas }, registro)
}
