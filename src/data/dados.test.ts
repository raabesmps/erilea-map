import { describe, expect, it } from 'vitest'
import lugaresJson from './lugares.json'
import rotasJson from './rotas.json'
import livrosJson from './livros.json'
import biomasJson from './biomas.json'
import { visiblePlaces, visibleRoutes } from '../lib/spoiler'
import type { Book, Place, PlaceType, Route } from '../types'

const lugares = lugaresJson as Place[]
const rotas = rotasJson as Route[]
const livros = livrosJson as Book[]
const MAX_BOOK = livros.length - 1

const TIPOS: PlaceType[] = ['cidade', 'fortaleza', 'floresta', 'montanha', 'regiao', 'porto', 'mina', 'saida', 'mar']
const hex = /^#[0-9A-Fa-f]{6}$/

describe('lugares.json: integridade', () => {
  it('ids são únicos', () => {
    const ids = lugares.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('posições ficam dentro do mapa (0..1)', () => {
    for (const p of lugares) {
      expect(p.x, p.id).toBeGreaterThan(0)
      expect(p.x, p.id).toBeLessThan(1)
      expect(p.y, p.id).toBeGreaterThan(0)
      expect(p.y, p.id).toBeLessThan(1)
    }
  })

  it('tipo, geo e livro são válidos', () => {
    for (const p of lugares) {
      expect(TIPOS, p.id).toContain(p.tipo)
      expect(['terra', 'costa', 'mar'], p.id).toContain(p.geo)
      expect(Number.isInteger(p.livro) && p.livro >= 0 && p.livro <= MAX_BOOK, p.id).toBe(true)
    }
  })

  it('todo lugar tem nome em PT e EN', () => {
    for (const p of lugares) {
      expect(p.nome.pt.trim().length, p.id).toBeGreaterThan(0)
      expect(p.nome.en.trim().length, p.id).toBeGreaterThan(0)
    }
  })

  it('"revisar", quando presente, é booleano verdadeiro', () => {
    for (const p of lugares) if (p.revisar !== undefined) expect(p.revisar, p.id).toBe(true)
  })
})

describe('lugares.json: regras de spoiler', () => {
  it('toda nota existe, está em PT e EN e nunca antecede o livro do lugar', () => {
    for (const p of lugares) {
      expect(p.notas.length, p.id).toBeGreaterThan(0)
      for (const n of p.notas) {
        expect(n.livro, `${p.id} nota`).toBeGreaterThanOrEqual(p.livro)
        expect(n.livro, `${p.id} nota`).toBeLessThanOrEqual(MAX_BOOK)
        expect(n.pt.trim().length, p.id).toBeGreaterThan(0)
        expect(n.en.trim().length, p.id).toBeGreaterThan(0)
      }
    }
  })

  it('a primeira nota aparece junto com o lugar (sem lugar mudo)', () => {
    for (const p of lugares) expect(Math.min(...p.notas.map((n) => n.livro)), p.id).toBe(p.livro)
  })

  it('não há duas notas no mesmo livro para o mesmo lugar', () => {
    for (const p of lugares) {
      const livrosDasNotas = p.notas.map((n) => n.livro)
      expect(new Set(livrosDasNotas).size, p.id).toBe(livrosDasNotas.length)
    }
  })

  it('o livro 0 só libera o que é do prelúdio', () => {
    for (const p of visiblePlaces(lugares, 0)) expect(p.livro).toBe(0)
  })
})

describe('lugares.json: decisões de nomenclatura e geografia', () => {
  it('Rifthold e Forte da Fenda são um único registro, com o Castelo de Vidro', () => {
    const fenda = lugares.filter((p) => p.nome.pt === 'Forte da Fenda' || p.nome.en === 'Rifthold')
    expect(fenda).toHaveLength(1)
    expect(fenda[0]!.nome).toEqual({ pt: 'Forte da Fenda', en: 'Rifthold' })
    expect(fenda[0]!.icone).toBe('vidro')
    expect(fenda[0]!.geo).toBe('costa')
  })

  it('Endovier fica na posição indicada pelo mapa original', () => {
    const e = lugares.find((p) => p.id === 'endovier')!
    expect(e.x).toBeCloseTo(0.665, 1)
    expect(e.y).toBeCloseTo(0.295, 1)
  })

  it('Terrasen está claramente no nordeste', () => {
    const t = lugares.find((p) => p.id === 'terrasen')!
    expect(t.x).toBeGreaterThan(0.6)
    expect(t.y).toBeLessThan(0.2)
  })

  it('as duas ocorrências de "Desertos Congelados" foram preservadas, em lugares distintos', () => {
    const dc = lugares.filter((p) => p.nome.pt === 'Desertos Congelados')
    expect(dc).toHaveLength(2)
    expect(Math.abs(dc[0]!.x - dc[1]!.x)).toBeGreaterThan(0.2)
    for (const p of dc) expect(p.geo).toBe('terra')
  })

  it('nomes só vêm do mapa original: nada do guia artístico sem verificação', () => {
    const nomes = lugares.map((p) => p.nome.pt)
    expect(nomes).not.toContain('Penhasco dos Abutres')
    expect(nomes).not.toContain('Selva Boggdano')
    expect(nomes).toContain('Penhasco dos Adustos')
    expect(lugares.find((p) => p.id === 'penhasco-adustos')!.revisar).toBe(true)
  })

  it('nomes de leitura duvidosa estão marcados para revisão', () => {
    const marcados = lugares.filter((p) => p.revisar).map((p) => p.id)
    for (const id of ['penhasco-adustos', 'perranth', 'suria', 'calaculla', 'canino-branco', 'oakwald']) {
      expect(marcados).toContain(id)
    }
  })

  it('Wendlyn é só uma seta além-mar, não um território', () => {
    const w = lugares.filter((p) => p.nome.pt.includes('Wendlyn'))
    expect(w).toHaveLength(1)
    expect(w[0]!.tipo).toBe('saida')
  })
})

describe('rotas.json', () => {
  it('ids únicos, pontos válidos e livro válido', () => {
    expect(new Set(rotas.map((r) => r.id)).size).toBe(rotas.length)
    for (const r of rotas) {
      expect(r.pontos.length, r.id).toBeGreaterThanOrEqual(2)
      expect(r.livro, r.id).toBeGreaterThanOrEqual(0)
      expect(r.livro, r.id).toBeLessThanOrEqual(MAX_BOOK)
      for (const [x, y] of r.pontos) {
        expect(x).toBeGreaterThan(0)
        expect(x).toBeLessThan(1)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(1)
      }
    }
  })

  it('as pontas de cada rota coincidem com lugares do mapa', () => {
    for (const r of rotas) {
      for (const [x, y] of [r.pontos[0]!, r.pontos[r.pontos.length - 1]!]) {
        const perto = lugares.some((p) => Math.hypot(p.x - x, p.y - y) < 0.03)
        expect(perto, `${r.id} (${x}, ${y})`).toBe(true)
      }
    }
  })

  it('uma rota nunca aparece antes dos lugares que liga (sem vazar spoiler)', () => {
    for (const r of rotas) {
      for (const [x, y] of [r.pontos[0]!, r.pontos[r.pontos.length - 1]!]) {
        const ponta = lugares.find((p) => Math.hypot(p.x - x, p.y - y) < 0.03)!
        expect(r.livro, `${r.id} -> ${ponta.id}`).toBeGreaterThanOrEqual(ponta.livro)
      }
    }
  })

  it('em qualquer livro, toda rota visível tem as duas pontas visíveis', () => {
    for (let b = 0; b <= MAX_BOOK; b++) {
      const ids = new Set(visiblePlaces(lugares, b).map((p) => p.id))
      for (const r of visibleRoutes(rotas, b)) {
        for (const [x, y] of [r.pontos[0]!, r.pontos[r.pontos.length - 1]!]) {
          const ponta = lugares.find((p) => Math.hypot(p.x - x, p.y - y) < 0.03)!
          expect(ids.has(ponta.id), `livro ${b}: ${r.id} -> ${ponta.id}`).toBe(true)
        }
      }
    }
  })
})

describe('livros.json e biomas.json', () => {
  it('livros são numerados de 0 a N sem buracos', () => {
    expect(livros.map((l) => l.id)).toEqual(livros.map((_, i) => i))
  })

  it('biomas têm cores hexadecimais válidas', () => {
    const cores: string[] = [biomasJson.padrao.cor]
    for (const z of biomasJson.zonas) cores.push(z.cor)
    for (const c of cores) expect(c).toMatch(hex)
  })
})
