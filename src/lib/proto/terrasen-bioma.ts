/**
 * Terrasen as a `BiomaRefinado` (step 0c.3): the first and, for now, ONLY real client of the generic planner.
 * It wires the existing Terrasen code to the contract; nothing in the planning, the palette, the washes or the styles changed.
 */
import type { BiomaRefinado } from '../biomas/bioma'
import { criarPeso } from '../biomas/amostragem'
import { desenharWashes, planejarTerrasen, protoDe, ZONA_MONTANHAS, ZONAS_TERRASEN, type PlanoTerrasen, type ProtoTerrasen } from './terrasen'
import { PALETA_ZONAS } from './terrasen-paleta'
import { registrarGlifosTerrasen } from './terrasen-glifos'

export const TERRASEN: BiomaRefinado<ProtoTerrasen, PlanoTerrasen> = {
  id: 'terrasen',
  zonas: ZONAS_TERRASEN,
  paleta: PALETA_ZONAS,
  pesoSubstituicao: 0.12,
  planejar(e, config) {
    const plano = planejarTerrasen({
      W: e.W,
      H: e.H,
      at: e.at,
      noise: e.noise,
      pesoT: e.peso,
      pesoMont: criarPeso(e.field, e.zonas, (id) => id === ZONA_MONTANHAS),
      obst: e.obst,
      ajuste: config.ajuste,
      ocupacao: e.ocupacao,
    })
    config.aoPlanejar?.(plano)
    return plano
  },
  desenharFundo: (ctx, plano, modo, config) => desenharWashes(ctx, plano, modo, config.ajuste),
  estilo: (modo, config) => (modo === 'cor' ? config.estilo : (config.estiloSepia ?? config.estilo)),
  vetorial: (config) => config.vetorial === true,
  registrarGlifos: registrarGlifosTerrasen,
  parametroUrl: 'terrasen',
  // ?terrasen=A|B|C|AB, exactly the values the URL state accepts; ?vetor=0 keeps the symbols in the raster
  configDaUrl: (valor, { vetor }) => (valor === 'A' || valor === 'B' || valor === 'C' || valor === 'AB' ? { ...protoDe(valor), vetorial: vetor } : null),
}
