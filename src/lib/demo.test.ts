import { describe, expect, it } from 'vitest'
import { DEMO, resolverTerrasen, TERRASEN_PADRAO } from './demo'

describe('modo de demonstração', () => {
  it('fora da demo (testes e dev), Terrasen fica desligada por padrão: o mapa é o da v1.0.0', () => {
    expect(DEMO).toBe(false)
    expect(TERRASEN_PADRAO).toBeNull()
    expect(resolverTerrasen(undefined)).toBeNull()
    expect(resolverTerrasen('lixo')).toBeNull()
  })
  it('os parâmetros de comparação continuam valendo', () => {
    for (const v of ['A', 'B', 'C', 'AB'] as const) expect(resolverTerrasen(v)).toBe(v)
  })
  it('na demo, sem parâmetro vale A em cor e B no sépia; ?terrasen=off volta ao mapa original', () => {
    expect(resolverTerrasen(undefined, 'AB')).toBe('AB')
    expect(resolverTerrasen('lixo', 'AB')).toBe('AB')
    expect(resolverTerrasen('off', 'AB')).toBeNull()
    expect(resolverTerrasen('C', 'AB')).toBe('C')
  })
})
