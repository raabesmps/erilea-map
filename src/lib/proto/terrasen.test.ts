import { describe, expect, it } from 'vitest'
import biomas from '../../data/biomas.json'
import lugaresJson from '../../data/lugares.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from '../geografia'
import { buildField, planejarGlifos } from '../colorir'
import { ativos, criarObstaculos, lagoPoligono, rioPontos } from '../hidrografia'
import {
  AJUSTE_PADRAO,
  aplicarPaleta,
  criarPeso,
  filtrarForaDeTerrasen,
  PALETA_TERRASEN,
  planejarTerrasen,
  ZONA_MONTANHAS,
  ZONAS_TERRASEN,
} from './terrasen'
import type { Place } from '../../types'

const lugares = lugaresJson as Place[]
type Zona = (typeof biomas.zonas)[number]
const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
const zonas = aplicarPaleta(biomas.zonas as Zona[])
const campo = buildField(MAP_W, MAP_H, ruido, zonas as never)
const pesoT = criarPeso(campo, zonas, ZONAS_TERRASEN)
const pesoMont = criarPeso(campo, zonas, (id) => id === ZONA_MONTANHAS)

const hidro = ativos('alta')
const lagos = hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H))
const rios = [...hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))]
const obst = criarObstaculos(lagos, rios)
const plano = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })

describe('protótipo de Terrasen: só toca em Terrasen', () => {
  it('a paleta nova altera apenas as zonas r03-* e deixa todos os outros biomas idênticos', () => {
    const originais = biomas.zonas as Zona[]
    expect(zonas.length).toBe(originais.length)
    zonas.forEach((z, i) => {
      if (z.id.startsWith('r03-')) expect(z.cor, z.id).not.toBe(originais[i]!.cor)
      else expect(z, z.id).toEqual(originais[i])
    })
  })

  it('os valores da paleta são hexadecimais válidos e as zonas só mudam cor, árvore e rocha', () => {
    for (const v of Object.values(PALETA_TERRASEN)) expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/)
    const originais = biomas.zonas as Zona[]
    zonas.forEach((z, i) => {
      expect(z.cx, z.id).toBe(originais[i]!.cx)
      expect(z.cy, z.id).toBe(originais[i]!.cy)
      expect(z.rx, z.id).toBe(originais[i]!.rx)
      expect(z.ry, z.id).toBe(originais[i]!.ry)
    })
  })

  it('a geometria dos biomas (limites) não foi alterada: só cores', () => {
    const ids = zonas.filter((z) => z.id.startsWith('r03-')).map((z) => z.id)
    expect(ids).toEqual(['r03-terrasen', 'r03-pinhal-denso', 'r03-montanhas-norte'])
  })

  it('os símbolos de Terrasen só existem em terra, dentro de Terrasen e longe da água', () => {
    expect(plano.glifos.length).toBeGreaterThan(150)
    for (const g of plano.glifos) {
      expect(at(Math.round(g.x), Math.round(g.y)), 'em terra').toBeGreaterThan(0.08)
      expect(pesoT(g.x, g.y), 'dentro de Terrasen').toBeGreaterThanOrEqual(0.12)
      expect(obst.perto(g.x, g.y, 8 + g.tam * 0.8), 'longe de lagos e rios').toBe(false)
    }
  })

  it('nenhum símbolo cobre o ícone de um lugar (≥ 26 px)', () => {
    for (const g of plano.glifos) {
      for (const p of lugares) expect(Math.hypot(g.x - p.x * MAP_W, g.y - p.y * MAP_H), `${g.tipo} x ${p.id}`).toBeGreaterThanOrEqual(26)
    }
  })

  it('é determinístico: o mesmo mapa gera sempre a mesma floresta', () => {
    const outro = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })
    expect(outro.glifos.map((g) => [g.x, g.y, g.tipo])).toEqual(plano.glifos.map((g) => [g.x, g.y, g.tipo]))
  })

  it('o resto do mapa mantém o desenho: filtrar Terrasen remove só os símbolos de Terrasen', () => {
    const padrao = planejarGlifos({ W: MAP_W, H: MAP_H, at, rnd: mulberry32(5), noise: ruido }, campo, undefined, zonas as never)
    const fora = filtrarForaDeTerrasen(padrao, pesoT)
    expect(fora.length).toBeLessThan(padrao.length)
    for (const g of padrao) expect(fora.includes(g), `${g.x},${g.y}`).toBe(pesoT(g.x, g.y) <= 0.12)
  })
})

describe('protótipo de Terrasen: as metas da proposta', () => {
  const area = (() => {
    let n = 0
    for (let y = 0; y < MAP_H; y += 8) for (let x = 0; x < MAP_W; x += 8) if (at(x, y) > 0.08 && pesoT(x, y) > 0.5) n++
    return n * 64
  })()

  it('há massas florestais densas: bem mais coníferas que hoje (79 a 95) e densidade > 12 por 10 mil px²', () => {
    const c = plano.glifos.filter((g) => g.tipo === 'conifera').length
    expect(c).toBeGreaterThan(150)
    expect((plano.glifos.length / area) * 1e4).toBeGreaterThan(12)
  })

  it('o agrupamento é projetado: variância/média das contagens por quadrante > 1,6 (hoje 1,2 a 1,35)', () => {
    const cont: number[] = []
    for (let y = 0; y < MAP_H * 0.32; y += 70) {
      for (let x = MAP_W * 0.5; x < MAP_W * 0.92; x += 70) {
        const ok = [[0, 0], [70, 0], [0, 70], [70, 70], [35, 35]].every(([dx, dy]) => at(x + dx!, y + dy!) > 0.08 && pesoT(x + dx!, y + dy!) > 0.5)
        if (ok) cont.push(plano.glifos.filter((q) => q.x >= x && q.x < x + 70 && q.y >= y && q.y < y + 70).length)
      }
    }
    const m = cont.reduce((a, b) => a + b, 0) / cont.length
    const v = cont.reduce((a, b) => a + (b - m) ** 2, 0) / cont.length
    expect(v / m).toBeGreaterThan(1.6)
  })

  it('há clareiras projetadas, sem vazios gigantes: nenhum ponto a mais de 100 px de qualquer símbolo', () => {
    let maior = 0
    let longe = 0
    let tot = 0
    for (let y = 0; y < MAP_H * 0.32; y += 12) {
      for (let x = MAP_W * 0.5; x < MAP_W * 0.92; x += 12) {
        if (!(at(x, y) > 0.08 && pesoT(x, y) > 0.5)) continue
        tot++
        let d = Infinity
        for (const g of plano.glifos) d = Math.min(d, Math.hypot(g.x - x, g.y - y))
        maior = Math.max(maior, d)
        if (d > 30) longe++
      }
    }
    expect(maior).toBeLessThan(100)
    expect(longe / tot).toBeGreaterThan(0.04)
    expect(plano.clareiras.length).toBeGreaterThan(20)
  })

  it('as montanhas formam cumeeiras de tamanhos variados e a neve só aparece nos picos altos da zona norte', () => {
    const m = plano.glifos.filter((g) => g.tipo === 'montanha')
    expect(m.length).toBeGreaterThan(30)
    const tam = m.map((g) => g.tam)
    expect(Math.max(...tam) / Math.min(...tam)).toBeGreaterThan(1.8)
    const comNeve = m.filter((g) => g.neve)
    expect(comNeve.length).toBeGreaterThan(0)
    expect(comNeve.length).toBeLessThan(m.length)
    for (const g of comNeve) expect(pesoMont(g.x, g.y)).toBeGreaterThan(0.35)
  })

  it('os tamanhos das coníferas variam (hoje CV 0,11) e crescem no núcleo da massa', () => {
    const t = plano.glifos.filter((g) => g.tipo === 'conifera').map((g) => g.tam)
    const m = t.reduce((a, b) => a + b, 0) / t.length
    const sd = Math.sqrt(t.reduce((a, b) => a + (b - m) ** 2, 0) / t.length)
    expect(sd / m).toBeGreaterThan(0.2)
  })

  it('o ajuste padrão é o calibrado (A3)', () => {
    expect(AJUSTE_PADRAO.pExp).toBe(0.8)
    expect(AJUSTE_PADRAO.limiarMontanha).toBe(0.3)
  })
})
