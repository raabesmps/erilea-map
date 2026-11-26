import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W } from '../geografia'
import type { ProtoTerrasen } from '../proto/terrasen'
import { TERRASEN } from '../proto/terrasen-bioma'
import { SINTETICO } from '../../../tests/fixtures/bioma-sintetico'
import { planejarTeste } from '../../../tests/fixtures/planejamento'
import { ordenarParaPintura, partesSvg, textoDeReferencia } from './camada-vetorial'
import type { PlanoDeBioma } from './registro'
import type { BiomaAtivo, BiomaQualquer } from './registro'

SINTETICO.registrarGlifos()

const vetorT: ProtoTerrasen = { estilo: 'A', estiloSepia: 'B', vetorial: true }
const ativoT = (config: ProtoTerrasen = vetorT): BiomaAtivo => ({ bioma: TERRASEN, config })
const ativoS = (vetorial = true): BiomaAtivo => ({ bioma: SINTETICO, config: { vetorial } })
const REGISTRO: BiomaQualquer[] = [TERRASEN, SINTETICO]

describe('camada vetorial generalizada: ordem global de pintura (step 0d.1)', () => {
  const soT = planejarTeste([ativoT()], REGISTRO).planos
  const dois = planejarTeste([ativoT(), ativoS()], REGISTRO).planos

  it('com Terrasen sozinha, a ordem é EXATAMENTE a do plano de Terrasen', () => {
    const o = ordenarParaPintura(soT, 'cor')
    expect(o).toHaveLength(151)
    expect(o.map((s) => s.g)).toEqual(soT[0]!.plano.glifos)
    expect(o.map((s) => s.i)).toEqual(o.map((_, k) => k))
    expect(new Set(o.map((s) => s.bioma))).toEqual(new Set(['terrasen']))
  })

  it('com dois biomas, y é não decrescente e os símbolos dos dois SE INTERCALAM (não há agrupamento)', () => {
    const o = ordenarParaPintura(dois, 'cor')
    for (let k = 1; k < o.length; k++) expect(o[k]!.g.y).toBeGreaterThanOrEqual(o[k - 1]!.g.y)
    const trocas = o.filter((s, k) => k > 0 && s.bioma !== o[k - 1]!.bioma).length
    expect(trocas).toBeGreaterThan(20)
  })

  it('cada símbolo aparece uma única vez e os símbolos de Terrasen mantêm a ordem relativa do plano original', () => {
    const o = ordenarParaPintura(dois, 'cor')
    const nT = dois[0]!.plano.glifos.length
    const nS = dois[1]!.plano.glifos.length
    expect(o).toHaveLength(nT + nS)
    expect(o.filter((s) => s.bioma === 'terrasen').map((s) => s.g)).toEqual(dois[0]!.plano.glifos)
    // the synthetic plan is in acceptance order (not y-sorted): its symbols must come out as its plan stably sorted by y
    expect(o.filter((s) => s.bioma === 'sintetico').map((s) => s.g)).toEqual([...dois[1]!.plano.glifos].sort((p, q) => p.y - q.y))
  })

  it('o estilo de cada símbolo é o do SEU bioma no modo pedido', () => {
    expect(ordenarParaPintura(dois, 'cor').filter((s) => s.bioma === 'terrasen').every((s) => s.estilo === 'A')).toBe(true)
    expect(ordenarParaPintura(dois, 'sepia').filter((s) => s.bioma === 'terrasen').every((s) => s.estilo === 'B')).toBe(true)
  })

  it('só entram os biomas cujos símbolos são desenhados pelo vetor (os outros ficam no raster)', () => {
    const soRaster = planejarTeste([ativoT({ estilo: 'A' }), ativoS(true)], REGISTRO).planos
    expect(new Set(ordenarParaPintura(soRaster, 'cor').map((s) => s.bioma))).toEqual(new Set(['sintetico']))
    expect(ordenarParaPintura(planejarTeste([ativoT({ estilo: 'A' })], REGISTRO).planos, 'cor')).toEqual([])
  })

  it('desempate determinístico: mesmo y => ordem do registro, depois ordem do próprio plano', () => {
    const g = (x: number, y: number, tipo = 'conifera') => ({ x, y, tipo, tam: 8, neve: false, rot: 0, v: 0 })
    const falso = (bioma: BiomaQualquer, config: unknown, glifos: ReturnType<typeof g>[]): PlanoDeBioma => ({ ativo: { bioma, config }, plano: { glifos }, peso: () => 1 })
    const planos = [falso(TERRASEN, vetorT, [g(10, 50), g(20, 50), g(30, 40)]), falso(SINTETICO, { vetorial: true }, [g(15, 50), g(25, 40)])]
    const o = ordenarParaPintura(planos, 'cor')
    expect(o.map((s) => `${s.bioma}:${s.g.x}`)).toEqual(['terrasen:30', 'sintetico:25', 'terrasen:10', 'terrasen:20', 'sintetico:15'])
    expect(ordenarParaPintura(planos, 'cor')).toEqual(o)
  })

  it('o texto de cada símbolo NÃO contém data-bioma e a numeração é a ordem global', () => {
    const partes = partesSvg(ordenarParaPintura(dois, 'cor'), 'cor', MAP_W, MAP_H)
    partes.forEach((p, k) => {
      expect(p.startsWith(`<g data-i="${k}" data-x="`)).toBe(true)
      expect(p).not.toContain('data-bioma')
    })
  })

  it('é determinístico e, na integração ao papel, só as cores mudam (a geometria dos caminhos é a mesma)', () => {
    const o = ordenarParaPintura(soT, 'sepia')
    const a = partesSvg(o, 'sepia', MAP_W, MAP_H, 0)
    expect(partesSvg(o, 'sepia', MAP_W, MAP_H, 0)).toEqual(a)
    const b = partesSvg(o, 'sepia', MAP_W, MAP_H, 1)
    const d = (partes: string[]) => partes.map((p) => [...p.matchAll(/ d="([^"]*)"/g)].map((m) => m[1]).join('|'))
    expect(d(b)).toEqual(d(a))
    expect(b).not.toEqual(a)
  })

  it('textoDeReferencia remove só o data-bioma e devolve o texto original, caractere por caractere', () => {
    const original = '<svg viewBox="0 0 10 10"><g data-i="0" data-x="1.0" data-y="2.0"><path d="M0 0"></path></g><g data-i="1" data-x="3.0" data-y="4.0"></g></svg>'
    const decorado = original.replace(/<g data-i="(\d)"([^>]*)>/g, '<g data-i="$1"$2 data-bioma="terrasen">')
    expect(decorado).not.toBe(original)
    expect(textoDeReferencia({ outerHTML: decorado } as unknown as SVGSVGElement)).toBe(original)
  })
})
