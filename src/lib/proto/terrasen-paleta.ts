/** Terrasen palette (moved verbatim out of terrasen.ts in step 0c.1; the values did not change). */

/** Proposed palette. Hexes come from the plan; distances to the neighbouring biomes were measured (Lab dE). */
export const PALETA_TERRASEN = {
  chao: '#527A70',
  floresta: '#1F4040',
  subbosque: '#173433',
  copaLuz: '#3A6B62',
  clareira: '#8FAA9C',
  bordaSul: '#66875F',
  rocha: '#78878D',
  rochaLuz: '#A9B7BC',
  rochaSombra: '#56646B',
  neve: '#DCE5E8',
  neveSombra: '#B8C9D0',
  neveBrilho: '#EDF1EF',
  tinta: '#40382D',
} as const

const PALETA_ZONAS: Record<string, { cor?: string; arv?: string; rocha?: string }> = {
  'r03-terrasen': { cor: PALETA_TERRASEN.chao, arv: PALETA_TERRASEN.floresta, rocha: PALETA_TERRASEN.rocha },
  'r03-pinhal-denso': { cor: '#2B4F4B', arv: PALETA_TERRASEN.floresta },
  'r03-montanhas-norte': { cor: '#7A8680', rocha: PALETA_TERRASEN.rocha },
}

/** Returns the zones with the proposed palette applied to the Terrasen ones only. */
export function aplicarPaleta<T extends { id: string; cor: string; arv?: string; rocha?: string }>(zonas: T[]): T[] {
  return zonas.map((z) => (PALETA_ZONAS[z.id] ? { ...z, ...PALETA_ZONAS[z.id] } : z))
}
