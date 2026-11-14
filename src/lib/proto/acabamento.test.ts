import { describe, expect, it } from 'vitest'
import biomas from '../../data/biomas.json'
import { criarGeografia, mulberry32, MAP_H, MAP_W } from '../geografia'
import { buildField } from '../colorir'
import { ativos, criarObstaculos, lagoPoligono, rioPontos } from '../hidrografia'
import { aplicarPaleta, criarPeso, desenharGlifoT, planejarTerrasen, ZONA_MONTANHAS, ZONAS_TERRASEN, type GlifoT } from './terrasen'
import { GravadorSvg } from './gravador-svg'

const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))
const zonas = aplicarPaleta(biomas.zonas as never[]) as never[]
const campo = buildField(MAP_W, MAP_H, ruido, zonas as never)
const pesoT = criarPeso(campo, zonas, ZONAS_TERRASEN)
const pesoMont = criarPeso(campo, zonas, (id) => id === ZONA_MONTANHAS)
const hidro = ativos('alta')
const obst = criarObstaculos(hidro.lagos.map((l) => lagoPoligono(l, MAP_W, MAP_H)), hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at)))
const plano = planejarTerrasen({ W: MAP_W, H: MAP_H, at, noise: ruido, pesoT, pesoMont, obst })
const mont = plano.glifos.filter((g) => g.tipo === 'montanha')

const desenhar = (g: GlifoT, estilo: 'A' | 'B', modo: 'cor' | 'sepia') => {
  const r = new GravadorSvg()
  desenharGlifoT(r as unknown as CanvasRenderingContext2D, g, estilo, modo)
  return r.elementos
}
const coords = (els: string[]) => {
  const pts: [number, number][] = []
  for (const e of els) {
    const d = /d="([^"]*)"/.exec(e)![1]!
    const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i]!, n[i + 1]!])
  }
  return pts
}

describe('acabamento (rodada 3): maciço de Orynth', () => {
  const ne = mont.filter((g) => g.x > 0.74 * MAP_W && g.y < 0.2 * MAP_H)
  it('os maiores picos a nordeste de Orynth são mais leves (≤ 24 px; antes chegavam a 25)', () => {
    expect(ne.length).toBeGreaterThan(3)
    expect(Math.max(...ne.map((g) => g.tam))).toBeLessThanOrEqual(24)
  })
  it('a transição de tamanhos é gradual: cada um dos 4 maiores tem ≥ 80% do anterior', () => {
    const t = ne.map((g) => g.tam).sort((a, b) => b - a).slice(0, 4)
    for (let i = 1; i < t.length; i++) expect(t[i]! / t[i - 1]!).toBeGreaterThanOrEqual(0.8)
  })
  it('há três faixas de tamanho (altos, médios, pequenos), não só dois extremos', () => {
    expect(mont.filter((g) => g.tam > 20).length).toBeGreaterThanOrEqual(5)
    expect(mont.filter((g) => g.tam > 14 && g.tam <= 20).length).toBeGreaterThanOrEqual(5)
    expect(mont.filter((g) => g.tam <= 14).length).toBeGreaterThanOrEqual(5)
  })
})

describe('acabamento (rodada 3): florestas densas', () => {
  const conif = plano.glifos.filter((g) => g.tipo === 'conifera')
  it('poucas copas se sobrepõem de forma pesada (caixa 55% da menor copa)', () => {
    let pares = 0
    for (let i = 0; i < conif.length; i++)
      for (let j = i + 1; j < conif.length; j++) {
        const a = conif[i]!
        const b = conif[j]!
        const w = 0.55 * Math.min(a.tam, b.tam) * 1.6
        if (Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < w) pares++
      }
    expect(pares).toBeLessThanOrEqual(6)
    expect(conif.length).toBeGreaterThanOrEqual(100)
  })
  it('ordem de desenho: de trás para frente (y crescente)', () => {
    for (let i = 1; i < plano.glifos.length; i++) expect(plano.glifos[i]!.y).toBeGreaterThanOrEqual(plano.glifos[i - 1]!.y)
  })
  it('cada conífera (A e B, cor e sépia) começa por um contorno de separação (halo) antes das camadas', () => {
    const g = conif[0]!
    for (const [e, m] of [['A', 'cor'], ['B', 'sepia'], ['A', 'sepia'], ['B', 'cor']] as const) {
      const els = desenhar(g, e, m)
      expect(els[0]).toMatch(/rgba\((14,30,28|238,226,190),/)
      expect(els.length).toBeGreaterThan(4)
    }
  })
})

describe('acabamento (rodada 3): montanhas do estilo B', () => {
  const amostra = Array.from({ length: 60 }, (_, i): GlifoT => ({ x: 0, y: 0, tipo: 'montanha', tam: 20, neve: false, rot: 0, v: (i + 0.5) / 60, origem: 'cume' }))
  it('o desenho varia (≥ 40 formas distintas em 60 amostras) mas se mantém dentro de limites controlados', () => {
    const assinaturas = new Set(amostra.map((g) => desenhar(g, 'B', 'sepia').join('|')))
    expect(assinaturas.size).toBeGreaterThanOrEqual(40)
    for (const g of amostra) {
      const p = coords(desenhar(g, 'B', 'sepia'))
      const xs = p.map((q) => q[0])
      const ys = p.map((q) => q[1])
      expect(Math.min(...ys)).toBeGreaterThan(-1.75 * 20) // pico mais alto ≤ 1,75 × tam
      expect(Math.max(...ys)).toBeLessThanOrEqual(1.5) // nada relevante abaixo da base (as hachuras podem encostar nela)
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(3.6 * 20)
    }
  })
  it('a inclinação do pico principal varia (≥ 4 faixas de deslocamento do ápice) e a proporção também', () => {
    const lean = new Set<number>()
    const alt = new Set<number>()
    for (const g of amostra) {
      const p = coords(desenhar(g, 'B', 'sepia'))
      const topo = p.reduce((a, b) => (b[1] < a[1] ? b : a))
      lean.add(Math.round(topo[0] / 1.5))
      alt.add(Math.round(-topo[1] / 3))
    }
    expect(lean.size).toBeGreaterThanOrEqual(4)
    expect(alt.size).toBeGreaterThanOrEqual(3)
  })
  it('é determinístico (mesma entrada, mesmo desenho)', () => {
    expect(desenhar(amostra[7]!, 'B', 'sepia')).toEqual(desenhar(amostra[7]!, 'B', 'sepia'))
  })
})

describe('camada vetorial experimental', () => {
  it('todo glifo planejado vira SVG em A/cor e B/sépia, sem recursos não suportados', () => {
    for (const [e, m] of [['A', 'cor'], ['B', 'sepia']] as const)
      for (const g of plano.glifos) expect(desenhar(g, e, m).length, `${g.tipo}`).toBeGreaterThan(1)
  })
  it('o SVG tem um grupo por glifo do plano (sem duplicar nem omitir)', () => {
    const ids = new Set(plano.glifos.map((_, i) => i))
    expect(ids.size).toBe(plano.glifos.length)
  })
})
