import type { VariacaoTerrasen } from './proto/terrasen'

/**
 * Public demo build (`vite build --mode demo`, which reads .env.demo). Only this build shows Terrasen without
 * URL parameters. Every other build (and `npm run dev`) behaves exactly like the approved v1.0.0 map.
 */
export const DEMO = import.meta.env.VITE_DEMO === '1'

/** Terrasen variation used when the URL says nothing: A in colour and B in sepia, in the demo only. */
export const TERRASEN_PADRAO: VariacaoTerrasen | null = DEMO ? 'AB' : null

/**
 * ?terrasen=A|B|C|AB picks a variation, ?terrasen=off switches Terrasen off (to compare with the original map
 * in the demo); anything else falls back to the build default.
 */
export function resolverTerrasen(param: unknown, padrao: VariacaoTerrasen | null = TERRASEN_PADRAO): VariacaoTerrasen | null {
  if (param === 'A' || param === 'B' || param === 'C' || param === 'AB') return param
  if (param === 'off') return null
  return padrao
}
