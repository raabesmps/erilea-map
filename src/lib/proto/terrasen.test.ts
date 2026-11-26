import { describe, expect, it } from 'vitest'
import biomas from '../../data/biomas.json'
import lugaresJson from '../../data/lugares.json'
import rotasJson from '../../data/rotas.json'
import { criarGeografia, distanciaCosta, mulberry32, MAP_H, MAP_W } from '../geografia'
import { buildField, planejarGlifos } from '../colorir'
import { ativos, criarObstaculos, distanciaAoCurso, lagoPoligono, rioPontos } from '../hidrografia'
import {
  AJUSTE_PADRAO,
  aplicarPaleta,
  ARTE,
  criarPeso,
  PALETA_TERRASEN,
  planejarTerrasen,
  protoDe,
  ZONA_MONTANHAS,
  ZONAS_TERRASEN,
} from './terrasen'
import type { Place, Route } from '../../types'
import { filtrarSubstituidos } from '../biomas/registro'
import { TERRASEN } from './terrasen-bioma'

const lugares = lugaresJson as Place[]
const rotas = rotasJson as Route[]
type Zona = (typeof biomas.zonas)[number]
const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
const zonas = aplicarPaleta(biomas.zonas as Zona[])
const campo = buildField(MAP_W, MAP_H, ruido, zonas as never)
const pesoT = criarPeso(campo, zonas, ZONAS_TERRASEN)
const pesoMont = criarPeso(campo, zonas, (id) => id === ZONA_MONTANHAS)

const hidro = ativos('alta')
const lagos = hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H))
const rios = hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))
const obst = criarObstaculos(lagos, rios)
const plano = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })
const area = (() => {
  let n = 0
  for (let y = 0; y < MAP_H; y += 8) for (let x = 0; x < MAP_W; x += 8) if (at(x, y) > 0.08 && pesoT(x, y) > 0.5) n++
  return n * 64
})()

/** Share of glyphs whose two nearest neighbours (within 45 px) are almost in line with them. */
function quaseAlinhados(g: { x: number; y: number }[]): number {
  let n = 0
  let col = 0
  for (let i = 0; i < g.length; i++) {
    const viz = g
      .map((q, j) => ({ j, d: Math.hypot(q.x - g[i]!.x, q.y - g[i]!.y) }))
      .filter((o) => o.j !== i && o.d < 45)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
    if (viz.length < 2) continue
    n++
    const a1 = Math.atan2(g[viz[0]!.j]!.y - g[i]!.y, g[viz[0]!.j]!.x - g[i]!.x)
    const a2 = Math.atan2(g[viz[1]!.j]!.y - g[i]!.y, g[viz[1]!.j]!.x - g[i]!.x)
    let d = Math.abs(a1 - a2)
    if (d > Math.PI) d = 2 * Math.PI - d
    if (d > (160 * Math.PI) / 180) col++
  }
  return n ? col / n : 0
}

describe('protótipo de Terrasen: só toca em Terrasen', () => {
  it('a paleta nova altera apenas as zonas r03-* e deixa todos os outros biomas idênticos', () => {
    const originais = biomas.zonas as Zona[]
    expect(zonas.length).toBe(originais.length)
    zonas.forEach((z, i) => {
      if (z.id.startsWith('r03-')) expect(z.cor, z.id).not.toBe(originais[i]!.cor)
      else expect(z, z.id).toEqual(originais[i])
    })
  })

  it('os valores da paleta são hexadecimais válidos e os LIMITES artísticos das zonas não mudam, só as cores', () => {
    for (const v of Object.values(PALETA_TERRASEN)) expect(v).toMatch(/^#[0-9A-Fa-f]{6}$/)
    const originais = biomas.zonas as Zona[]
    zonas.forEach((z, i) => {
      expect([z.cx, z.cy, z.rx, z.ry], z.id).toEqual([originais[i]!.cx, originais[i]!.cy, originais[i]!.rx, originais[i]!.ry])
    })
  })

  it('a decisão da autora: estilo A em cor e B no sépia', () => {
    expect(protoDe('AB')).toEqual({ estilo: 'A', estiloSepia: 'B' })
    expect(protoDe('C')).toEqual({ estilo: 'C' })
  })

  it('os símbolos só existem em terra, dentro de Terrasen e longe de lagos e rios', () => {
    expect(plano.glifos.length).toBeGreaterThan(100)
    for (const g of plano.glifos) {
      expect(at(Math.round(g.x), Math.round(g.y)), 'em terra').toBeGreaterThan(0.08)
      expect(pesoT(g.x, g.y), 'dentro de Terrasen').toBeGreaterThanOrEqual(0.12)
      expect(obst.perto(g.x, g.y, AJUSTE_PADRAO.margemAgua), 'longe de água').toBe(false)
    }
  })

  it('nenhum símbolo cobre um ícone (≥ 30 px) nem o rótulo logo abaixo dele', () => {
    for (const g of plano.glifos) {
      for (const p of lugares) {
        const px = p.x * MAP_W
        const py = p.y * MAP_H
        expect(Math.hypot(g.x - px, g.y - py), `${g.tipo} x ${p.id}`).toBeGreaterThanOrEqual(AJUSTE_PADRAO.folgaIcone)
        const naCaixaDoRotulo = Math.abs(g.x - px) < 52 && g.y > py + 6 && g.y < py + 38
        expect(naCaixaDoRotulo, `${g.tipo} sobre o rótulo de ${p.id}`).toBe(false)
      }
    }
  })

  it('as rotas de viagem continuam legíveis: nenhum símbolo a menos de 13 px delas', () => {
    for (const g of plano.glifos) {
      for (const r of rotas) {
        const pts = r.pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H }))
        expect(distanciaAoCurso(g.x, g.y, pts), `${g.tipo} x ${r.id}`).toBeGreaterThanOrEqual(AJUSTE_PADRAO.margemRota)
      }
    }
  })

  it('é determinístico: o mesmo mapa gera sempre a mesma floresta', () => {
    const outro = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })
    expect(outro.glifos.map((g) => [g.x, g.y, g.tipo])).toEqual(plano.glifos.map((g) => [g.x, g.y, g.tipo]))
  })

  it('o resto do mapa mantém o desenho: filtrar Terrasen remove só os símbolos de Terrasen', () => {
    const padrao = planejarGlifos({ W: MAP_W, H: MAP_H, at, rnd: mulberry32(5), noise: ruido }, campo, undefined, zonas as never)
    const fora = filtrarSubstituidos(padrao, [{ ativo: { bioma: TERRASEN, config: { estilo: 'A' } }, plano, peso: pesoT }])
    expect(fora.length).toBeLessThan(padrao.length)
    for (const g of padrao) expect(fora.includes(g), `${g.x},${g.y}`).toBe(pesoT(g.x, g.y) <= 0.12)
  })
})

describe('limites ARTÍSTICOS (cumeeiras e núcleos) são dados, separados da geografia aprovada', () => {
  it('cada cumeeira e núcleo cita a origem ([MAPA] ou [ARTE]) e fica em terra firme', () => {
    for (const c of ARTE.cumeeiras) {
      expect(c.ref, c.id).toMatch(/\[(MAPA|ARTE)\]/)
      for (const [x, y] of c.pontos) {
        expect(at(x * MAP_W, y * MAP_H), `${c.id} em terra`).toBeGreaterThan(0.08)
        expect(distanciaCosta(elevacao, x * MAP_W, y * MAP_H), `${c.id} a ${x},${y} da costa`).toBeGreaterThanOrEqual(25)
      }
    }
    for (const n of ARTE.nucleos) {
      expect(n.ref, n.id).toMatch(/\[(MAPA|ARTE)\]/)
      expect(at(n.x * MAP_W, n.y * MAP_H), n.id).toBeGreaterThan(0.08)
    }
  })

  it('as cumeeiras ficam dentro de Terrasen e longe dos ícones (≥ 30 px) e dos lagos', () => {
    for (const c of ARTE.cumeeiras) {
      for (const [x, y] of c.pontos) {
        expect(pesoT(x * MAP_W, y * MAP_H), `${c.id} dentro de Terrasen`).toBeGreaterThan(0.4)
        for (const p of lugares) expect(Math.hypot((p.x - x) * MAP_W, (p.y - y) * MAP_H), `${c.id} x ${p.id}`).toBeGreaterThanOrEqual(30)
        expect(obst.perto(x * MAP_W, y * MAP_H, 10), `${c.id} sobre a água`).toBe(false)
      }
    }
  })

  it('há cumeeiras no noroeste, no norte (picos altos), no maciço de Orynth e na borda da floresta', () => {
    expect(ARTE.cumeeiras.map((c) => c.id)).toEqual(['noroeste', 'norte-picos-altos', 'maciço-de-orynth', 'borda-da-floresta'])
  })

  it('o peso visual da cadeia noroeste foi reduzido: menor força, sem neve, e menos montanhas que a cumeeira norte', () => {
    const nw = ARTE.cumeeiras.find((c) => c.id === 'noroeste')!
    const norte = ARTE.cumeeiras.find((c) => c.id === 'norte-picos-altos')!
    expect(nw.forca).toBeLessThan(norte.forca)
    expect(nw.neve).toBe(false)
    const perto = (c: typeof nw) => plano.glifos.filter((g) => g.tipo === 'montanha' && c.pontos.some(([x, y]) => Math.hypot(g.x - x * MAP_W, g.y - y * MAP_H) < 60)).length
    expect(perto(nw)).toBeLessThan(perto(norte))
  })

  it('as montanhas seguem as cumeeiras lidas do impresso (até 1,8 vez a largura da cumeeira)', () => {
    const cume = plano.glifos.filter((g) => g.origem === 'cume')
    expect(cume.length).toBeGreaterThan(25)
    for (const g of cume) {
      const d = Math.min(...ARTE.cumeeiras.map((c) => distanciaAoCurso(g.x, g.y, c.pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H })))))
      expect(d, `montanha em ${g.x | 0},${g.y | 0}`).toBeLessThanOrEqual(ARTE.cumeeiras.reduce((m, c) => Math.max(m, c.largura), 0) * MAP_W * 1.8)
    }
  })

  it('as colinas de transição existem e nunca têm neve; a neve só aparece em montanhas altas de cumeeira com neve', () => {
    const colinas = plano.glifos.filter((g) => g.tipo === 'colina')
    expect(colinas.length).toBeGreaterThanOrEqual(2)
    for (const g of colinas) expect(g.neve).toBe(false)
    const comNeve = plano.glifos.filter((g) => g.neve)
    expect(comNeve.length).toBeGreaterThan(0)
    expect(comNeve.length).toBeLessThanOrEqual(12)
    for (const g of comNeve) expect(g.tipo).toBe('montanha')
  })
})

describe('protótipo de Terrasen: as metas do refinamento', () => {
  it('há massas com núcleo denso e agrupamento projetado (variância/média por quadrante > 1,6)', () => {
    const conif = plano.glifos.filter((g) => g.tipo === 'conifera')
    expect(conif.length).toBeGreaterThan(80)
    const cont: number[] = []
    for (let y = 0; y < MAP_H * 0.32; y += 70) {
      for (let x = MAP_W * 0.5; x < MAP_W * 0.92; x += 70) {
        const ok = [[0, 0], [70, 0], [0, 70], [70, 70], [35, 35]].every(([dx, dy]) => at(x + dx!, y + dy!) > 0.08 && pesoT(x + dx!, y + dy!) > 0.5)
        if (ok) cont.push(conif.filter((q) => q.x >= x && q.x < x + 70 && q.y >= y && q.y < y + 70).length)
      }
    }
    const m = cont.reduce((a, b) => a + b, 0) / cont.length
    const v = cont.reduce((a, b) => a + (b - m) ** 2, 0) / cont.length
    expect(v / m).toBeGreaterThan(1.6)
  })

  it('sem fileiras regulares: coníferas abaixo do acaso uniforme (≈ 9%) e montanhas não mais regulares que pontos aleatórios nas mesmas cumeeiras', () => {
    expect(quaseAlinhados(plano.glifos.filter((g) => g.tipo === 'conifera'))).toBeLessThan(0.12)
    const mont = plano.glifos.filter((g) => g.tipo === 'montanha')
    // null model: same number of mountains, uniformly random inside the same ridge bands
    const bandas = ARTE.cumeeiras.map((c) => ({ c, pts: c.pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H })) }))
    let soma = 0
    for (let seed = 1; seed <= 6; seed++) {
      const rnd = mulberry32(seed * 101)
      const nulo: { x: number; y: number }[] = []
      while (nulo.length < mont.length) {
        const b = bandas[Math.floor(rnd() * bandas.length)]!
        const i = Math.floor(rnd() * (b.pts.length - 1))
        const f = rnd()
        const x = b.pts[i]!.x + (b.pts[i + 1]!.x - b.pts[i]!.x) * f + (rnd() - 0.5) * 2 * b.c.largura * MAP_W
        const y = b.pts[i]!.y + (b.pts[i + 1]!.y - b.pts[i]!.y) * f + (rnd() - 0.5) * 2 * b.c.largura * MAP_W
        nulo.push({ x, y })
      }
      soma += quaseAlinhados(nulo)
    }
    expect(quaseAlinhados(mont)).toBeLessThanOrEqual(soma / 6 + 0.04)
  })

  it('há clareiras intencionais (≥ 4), pequenas bosquetes de borda e tamanhos que variam (CV > 0,2)', () => {
    expect(plano.clareiras.length).toBeGreaterThanOrEqual(4)
    expect(plano.glifos.filter((g) => g.origem === 'bosque').length).toBeGreaterThan(8)
    const t = plano.glifos.filter((g) => g.tipo === 'conifera').map((g) => g.tam)
    const m = t.reduce((a, b) => a + b, 0) / t.length
    const sd = Math.sqrt(t.reduce((a, b) => a + (b - m) ** 2, 0) / t.length)
    expect(sd / m).toBeGreaterThan(0.2)
  })

  it('não há vazios gigantes: nenhum ponto de Terrasen a mais de 100 px de qualquer símbolo', () => {
    let maior = 0
    for (let y = 0; y < MAP_H * 0.32; y += 12) {
      for (let x = MAP_W * 0.5; x < MAP_W * 0.92; x += 12) {
        if (!(at(x, y) > 0.08 && pesoT(x, y) > 0.5)) continue
        let d = Infinity
        for (const g of plano.glifos) d = Math.min(d, Math.hypot(g.x - x, g.y - y))
        maior = Math.max(maior, d)
      }
    }
    expect(maior).toBeLessThan(100)
    expect((plano.glifos.length / area) * 1e4).toBeGreaterThan(6)
  })

  it('a lavagem clara das clareiras ficou mais suave (≤ 0,25) e a das massas escuras também', () => {
    expect(AJUSTE_PADRAO.lavagemClareira).toBeLessThanOrEqual(0.25)
    expect(AJUSTE_PADRAO.lavagemMassa).toBeLessThanOrEqual(0.1)
  })
})
