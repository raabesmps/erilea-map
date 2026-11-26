import { describe, expect, it } from 'vitest'
import './registro' // registers the glyph types of the registered biomes
import { desenharGlifo, glifosRegistrados, registrarGlifo, type Desenhista } from './glifos'
import type { GlifoBase } from './tipos'

const g = (tipo: string): GlifoBase => ({ x: 1, y: 2, tipo, tam: 10, neve: false, rot: 0, v: 0.5 })

describe('registro de glifos', () => {
  it('Terrasen registra exatamente os seus três tipos', () => {
    expect(glifosRegistrados()).toEqual(expect.arrayContaining(['colina', 'conifera', 'montanha']))
  })

  it('tipo sem desenhista é um erro explícito, não um desenho qualquer', () => {
    expect(() => desenharGlifo({} as CanvasRenderingContext2D, g('inexistente-xyz'), 'A', 'cor')).toThrow(/sem desenhista registrado/)
  })

  it('registrar de novo a MESMA função é inofensivo; outra função para o mesmo tipo é um erro (sem sobrescrever em silêncio)', () => {
    const a: Desenhista = () => undefined
    const b: Desenhista = () => undefined
    registrarGlifo('teste-registro-a', a)
    expect(() => registrarGlifo('teste-registro-a', a)).not.toThrow()
    expect(() => registrarGlifo('teste-registro-a', b)).toThrow(/outro desenhista/)
    expect(() => registrarGlifo('conifera', b)).toThrow(/outro desenhista/)
  })

  it('o registro despacha pelo tipo e repassa estilo e modo', () => {
    const chamadas: string[] = []
    registrarGlifo('teste-despacho', (_ctx, glifo, estilo, modo) => chamadas.push(`${glifo.tipo}/${estilo}/${modo}`))
    desenharGlifo({} as CanvasRenderingContext2D, g('teste-despacho'), 'B', 'sepia')
    expect(chamadas).toEqual(['teste-despacho/B/sepia'])
  })
})
