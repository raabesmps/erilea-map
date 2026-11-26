/**
 * R2 (independence of order) and the registry contract (step 0c.3). The second biome here is SYNTHETIC and lives only in this
 * test: Adarlan is not implemented and the production registry holds Terrasen alone.
 */
import { describe, expect, it } from 'vitest'
import biomas from '../../data/biomas.json'
import mestre from '../../../tests/navegador/mestre.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from '../geografia'
import { buildField, tracarRios } from '../colorir'
import { ativos as hidroAtiva, criarObstaculos, lagoPoligono, rioPontos } from '../hidrografia'
import { aplicarPaleta, type ProtoTerrasen } from '../proto/terrasen'
import { TERRASEN } from '../proto/terrasen-bioma'
import { candidatosPorPrioridade } from './amostragem'
import { criarAceitador } from './aceitador'
import type { BiomaRefinado, PlanoBioma } from './bioma'
import { aplicarPaletas, BIOMAS_REFINADOS, emOrdemDeRegistro, filtrarSubstituidos, planejarBiomas, substituidoEm, validarRegistro, type BiomaAtivo, type BiomaQualquer } from './registro'
import type { GlifoBase } from './tipos'

const fnv = (s: string) => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619) >>> 0
  }
  return x.toString(16)
}
const hashPlano = (g: { tipo: string; x: number; y: number; tam: number; neve: boolean; rot: number; v: number; origem?: string }[]) =>
  fnv(JSON.stringify(g.map((q) => [q.tipo, +q.x.toFixed(1), +q.y.toFixed(1), +q.tam.toFixed(2), q.neve ? 1 : 0, +q.rot.toFixed(3), +q.v.toFixed(3), q.origem])))

/** A biome that exists only here: it tries to fill the SAME window Terrasen uses, ignoring its own zone weight on purpose. */
const SINTETICO: BiomaRefinado<unknown, PlanoBioma> = {
  id: 'sintetico',
  zonas: (id) => id.startsWith('r05-'),
  paleta: {},
  pesoSubstituicao: 0.12,
  planejar(e) {
    const ac = criarAceitador<GlifoBase>({ W: e.W, H: e.H, at: e.at, peso: () => 1, pesoMin: 0.12, obst: e.obst, folgaIcone: 30, margemRota: 13, ocupacao: e.ocupacao })
    for (const c of candidatosPorPrioridade(0.5 * e.W, 0, 0.92 * e.W, 0.32 * e.H, 12)) ac.tentar({ x: c.x, y: c.y, tipo: 'sintetico-teste', tam: 8, neve: false, rot: 0, v: 0 }, 10, 14)
    return { glifos: ac.glifos }
  },
  estilo: () => 'A',
  vetorial: () => false,
  registrarGlifos: () => undefined,
}

const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
const hidro = hidroAtiva('alta')
const obst = criarObstaculos(
  hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H)),
  [...tracarRios({ W: MAP_W, H: MAP_H, at, noise: ruido }, hidro.substituidos).map((r) => r.pts), ...hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))],
)
const CONFIG_TERRASEN: ProtoTerrasen = { estilo: 'A', estiloSepia: 'B' }
const ativoT: BiomaAtivo = { bioma: TERRASEN, config: CONFIG_TERRASEN }
const ativoS: BiomaAtivo = { bioma: SINTETICO, config: {} }
const zonasDe = (ativos: BiomaAtivo[]) => aplicaZonas(ativos)
function aplicaZonas(ativos: BiomaAtivo[]) {
  return aplicarPaletas(biomas.zonas as never[], ativos) as never[]
}
function plano(ativos: BiomaAtivo[], registro: readonly BiomaQualquer[] = [TERRASEN, SINTETICO]) {
  const zonas = zonasDe(ativos)
  const field = buildField(MAP_W, MAP_H, ruido, zonas)
  return planejarBiomas(ativos, { W: MAP_W, H: MAP_H, at, noise: ruido, obst, field, zonas }, registro)
}

describe('registro de biomas refinados', () => {
  it('o registro de produção tem Terrasen e só Terrasen (Adarlan não está registrado)', () => {
    expect(BIOMAS_REFINADOS.map((b) => b.id)).toEqual(['terrasen'])
  })

  it('Terrasen planejada pelo registro reproduz o plano mestre da semente 11 (151 símbolos, hash 8a7cb845)', () => {
    const r = plano([ativoT])
    const esperado = (mestre.casos as unknown as Record<string, { plano: { n: number; hash: string } }>)['11|colorido|raster']!.plano
    expect(r.planos).toHaveLength(1)
    expect(r.planos[0]!.plano.glifos).toHaveLength(esperado.n)
    expect(hashPlano(r.planos[0]!.plano.glifos as never)).toBe(esperado.hash)
  })

  it('é determinístico: dois planejamentos iguais dão exatamente os mesmos planos', () => {
    const a = plano([ativoT, ativoS])
    const b = plano([ativoT, ativoS])
    expect(b.planos.map((p) => p.plano)).toEqual(a.planos.map((p) => p.plano))
    expect(b.ocupacao.itens()).toEqual(a.ocupacao.itens())
  })
})

describe('R2: registrar um segundo bioma não altera nenhum símbolo de Terrasen', () => {
  const sozinha = plano([ativoT]).planos[0]!.plano.glifos
  const comOutro = plano([ativoT, ativoS])

  it('com o bioma sintético registrado, a lista de símbolos de Terrasen é idêntica, um a um', () => {
    expect(comOutro.planos.map((p) => p.ativo.bioma.id)).toEqual(['terrasen', 'sintetico'])
    expect(comOutro.planos[0]!.plano.glifos).toEqual(sozinha)
    expect(comOutro.planos[0]!.plano.glifos).toHaveLength(151)
  })

  it('a ordem em que os biomas são passados não importa: a do registro é aplicada', () => {
    const invertido = plano([ativoS, ativoT])
    expect(invertido.planos.map((p) => p.ativo.bioma.id)).toEqual(['terrasen', 'sintetico'])
    expect(invertido.planos[0]!.plano.glifos).toEqual(sozinha)
    expect(invertido.planos[1]!.plano.glifos).toEqual(comOutro.planos[1]!.plano.glifos)
  })

  it('o segundo bioma ocupa espaço (o teste não é vazio) e respeita a ocupação do primeiro', () => {
    const nT = sozinha.length
    const itens = comOutro.ocupacao.itens()
    const nS = comOutro.planos[1]!.plano.glifos.length
    expect(nS).toBeGreaterThan(20)
    expect(itens).toHaveLength(nT + nS)
    const deT = itens.slice(0, nT)
    const deS = itens.slice(nT)
    for (const s of deS) for (const t of deT) expect(Math.hypot(s.x - t.x, s.y - t.y), `(${s.x.toFixed(1)},${s.y.toFixed(1)})`).toBeGreaterThanOrEqual(0.5 * (s.r + t.r) * 0.95)
  })

  it('controle negativo: sem a ocupação compartilhada o segundo bioma COLIDIRIA com Terrasen', () => {
    const nT = sozinha.length
    const deT = comOutro.ocupacao.itens().slice(0, nT)
    const livre = plano([ativoS], [TERRASEN, SINTETICO]).planos[0]!.plano.glifos
    let colisoes = 0
    for (const s of livre) for (const t of deT) if (Math.hypot(s.x - t.x, s.y - t.y) < 0.5 * (10 + t.r) * 0.95) colisoes++
    expect(colisoes).toBeGreaterThan(10)
  })

  it('a ordem do registro é o que protege Terrasen: se o sintético viesse primeiro, Terrasen mudaria', () => {
    const invertido = plano([ativoS, ativoT], [SINTETICO, TERRASEN])
    expect(invertido.planos.map((p) => p.ativo.bioma.id)).toEqual(['sintetico', 'terrasen'])
    expect(invertido.planos[1]!.plano.glifos).not.toEqual(sozinha)
  })

  it('bioma fora do registro é recusado', () => {
    expect(() => emOrdemDeRegistro([ativoS], [TERRASEN])).toThrow(/fora do registro/)
  })
})

describe('propriedade exclusiva das zonas', () => {
  const ids = biomas.zonas.map((z) => z.id)

  it('no registro de produção nenhuma zona pertence a dois biomas e não há problema algum', () => {
    expect(validarRegistro(BIOMAS_REFINADOS, ids)).toEqual([])
  })

  it('Terrasen possui exatamente as três zonas r03-*', () => {
    expect(ids.filter((id) => TERRASEN.zonas(id)).sort()).toEqual(['r03-montanhas-norte', 'r03-pinhal-denso', 'r03-terrasen'])
  })

  it('o bioma sintético é exclusivo em relação a Terrasen', () => {
    expect(validarRegistro([TERRASEN, SINTETICO], ids)).toEqual([])
    expect(ids.filter((id) => SINTETICO.zonas(id)).every((id) => !TERRASEN.zonas(id))).toBe(true)
  })

  it('detecta uma zona reivindicada por dois biomas, um id repetido e uma paleta sobre zona alheia', () => {
    const rival: BiomaRefinado = { ...SINTETICO, id: 'rival', zonas: (id) => id.startsWith('r03-') }
    expect(validarRegistro([TERRASEN, rival], ids).some((p) => p.includes('r03-terrasen') && p.includes('terrasen, rival'))).toBe(true)
    expect(validarRegistro([TERRASEN, { ...SINTETICO, id: 'terrasen' }], ids).some((p) => p.includes('id repetido'))).toBe(true)
    const intruso: BiomaRefinado = { ...SINTETICO, id: 'intruso', paleta: { 'r03-terrasen': { cor: '#000000' } } }
    expect(validarRegistro([intruso], ids).some((p) => p.includes('não é uma zona dele'))).toBe(true)
  })
})

describe('paleta, substituição dos símbolos padrão e fundos pelo registro', () => {
  it('aplicarPaletas com Terrasen = aplicarPaleta de Terrasen; as zonas dos outros biomas passam intactas (mesmo objeto)', () => {
    const zonas = biomas.zonas as { id: string; cor: string }[]
    const novo = aplicarPaletas(zonas, [ativoT])
    expect(novo).toEqual(aplicarPaleta(zonas))
    zonas.forEach((z, i) => {
      if (!TERRASEN.zonas(z.id)) expect(novo[i]).toBe(z)
    })
  })

  it('filtrarSubstituidos e substituidoEm equivalem ao filtro antigo de Terrasen (peso ≤ 0,12 permanece)', () => {
    const r = plano([ativoT])
    const pesoT = r.planos[0]!.peso
    const ops = Array.from({ length: 3000 }, (_, i) => ({ x: 100 + (i % 60) * 38, y: 20 + Math.floor(i / 60) * 11 }))
    const antigo = ops.filter((o) => pesoT(o.x, o.y) <= 0.12)
    expect(filtrarSubstituidos(ops, r.planos)).toEqual(antigo)
    for (const o of ops.slice(0, 400)) expect(substituidoEm(o.x, o.y, r.planos)).toBe(pesoT(o.x, o.y) > 0.12)
    expect(antigo.length).toBeLessThan(ops.length)
  })

  it('o estilo e o modo vetorial vêm da configuração de Terrasen', () => {
    expect(TERRASEN.estilo('cor', CONFIG_TERRASEN)).toBe('A')
    expect(TERRASEN.estilo('sepia', CONFIG_TERRASEN)).toBe('B')
    expect(TERRASEN.estilo('sepia', { estilo: 'C' })).toBe('C')
    expect(TERRASEN.vetorial({ estilo: 'A' })).toBe(false)
    expect(TERRASEN.vetorial({ estilo: 'A', vetorial: true })).toBe(true)
  })
})
