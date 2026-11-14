import { describe, expect, it } from 'vitest'
import lugaresJson from '../data/lugares.json'
import rotasJson from '../data/rotas.json'
import { criarGeografia, distanciaCosta, mulberry32, MAP_H, MAP_W } from './geografia'
import { buildField, planejarGlifos } from './colorir'
import {
  ativos,
  criarObstaculos,
  dentroDoPoligono,
  distanciaAoCurso,
  distanciaAoPoligono,
  HIDROGRAFIA,
  lagoPoligono,
  permite,
  rioPontos,
  type LagoDef,
  type RioDef,
} from './hidrografia'
import type { Place, Route } from '../types'

const lugares = lugaresJson as Place[]
const { elevacao, ruido } = criarGeografia(mulberry32(11), MAP_W, MAP_H, 'v3')
const at = (x: number, y: number) => elevacao(Math.min(MAP_W - 1, Math.max(0, x)), Math.min(MAP_H - 1, Math.max(0, y)))

const todosOsNiveis = ['alta', 'media'] as const

describe('hidrografia: dados e regras de confiança', () => {
  const todos = [...HIDROGRAFIA.lagos, ...HIDROGRAFIA.pendentes, ...HIDROGRAFIA.rios, ...HIDROGRAFIA.candidatos]

  it('ids são únicos', () => {
    const ids = todos.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nenhum lago ou rio recebe nome sem confirmação', () => {
    for (const x of [...HIDROGRAFIA.lagos, ...HIDROGRAFIA.pendentes, ...HIDROGRAFIA.rios]) expect(x.nome, x.id).toBeNull()
  })

  it('o nível padrão ("alta") desenha os dois lagos de alta confiança e o rio de Orynth (experimental)', () => {
    const a = ativos('alta')
    expect(a.lagos.map((l) => l.id)).toEqual(['lago-eyllwe-norte', 'lago-perranth'])
    expect(a.rios.map((r) => r.id)).toEqual(['rio-orynth'])
  })

  it('o nível "nenhuma" não desenha hidrografia (serve para as imagens de "antes")', () => {
    const n = ativos('nenhuma')
    expect(n.lagos).toEqual([])
    expect(n.rios).toEqual([])
    expect(n.substituidos.size).toBe(0)
  })

  it('o nível "media" acrescenta os de média confiança e substitui o rio gerado de Melisande', () => {
    const m = ativos('media')
    expect(m.lagos.map((l) => l.id)).toEqual(['lago-eyllwe-norte', 'lago-perranth', 'lago-anielle', 'lago-pantano-pequeno'])
    expect(m.rios.map((r) => r.id)).toEqual(['rio-orynth', 'rio-melisande-curso'])
    expect([...m.substituidos]).toEqual(['melisande-1'])
  })

  it('elementos de baixa confiança nunca são desenhados', () => {
    for (const n of todosOsNiveis) {
      const a = ativos(n)
      for (const x of [...a.lagos, ...a.rios]) expect(x.confianca, x.id).not.toBe('baixa')
    }
    expect(permite('baixa', 'media')).toBe(false)
  })

  it('o lago de Orynth está pendente de confirmação e jamais é desenhado', () => {
    const l = HIDROGRAFIA.pendentes.find((x) => x.id === 'lago-orynth')!
    expect(l.pendente).toBe(true)
    expect(l.motivo!.length).toBeGreaterThan(20)
    for (const n of todosOsNiveis) expect(ativos(n).lagos.map((x) => x.id)).not.toContain('lago-orynth')
  })

  it('Avery-sul, tronco do Pântano, Desfiladeiro e saída de Perranth são candidatos, com a decisão da autora, e jamais são desenhados', () => {
    expect(HIDROGRAFIA.candidatos.map((c) => c.id).sort()).toEqual(['avery-sul', 'desfiladeiro-ferro', 'saida-perranth', 'tronco-pantano'])
    for (const c of HIDROGRAFIA.candidatos) {
      expect(c.status).toBe('aguardando-decisao')
      expect(c.decisao!.length, c.id).toBeGreaterThan(20)
    }
    expect(HIDROGRAFIA.candidatos.find((c) => c.id === 'avery-sul')!.decisao).toMatch(/NÃO implementar/)
    expect(HIDROGRAFIA.candidatos.find((c) => c.id === 'desfiladeiro-ferro')!.decisao).toMatch(/NÃO implementar como rio/)
    for (const n of todosOsNiveis) {
      const ids = new Set(ativos(n).rios.map((r) => r.id))
      for (const c of HIDROGRAFIA.candidatos) expect(ids.has(c.id), c.id).toBe(false)
    }
  })

  it('afluentes do Pântano estão pendentes e jamais são desenhados', () => {
    const afluentes = HIDROGRAFIA.rios.filter((x) => x.id.startsWith('afluente-pantano'))
    expect(afluentes.length).toBe(3)
    for (const n of todosOsNiveis) {
      const ids = ativos(n).rios.map((r) => r.id)
      for (const r of afluentes) {
        expect(r.pendente, r.id).toBe(true)
        expect(ids, r.id).not.toContain(r.id)
      }
    }
  })

  it('rios pendentes nunca são desenhados', () => {
    for (const n of todosOsNiveis) for (const r of ativos(n).rios) expect(r.pendente, r.id).not.toBe(true)
  })
})

describe('hidrografia: lagos', () => {
  const lagos = ativos('media').lagos
  const polys = lagos.map((l: LagoDef) => ({ l, poly: lagoPoligono(l) }))

  it('todo lago fica inteiro em terra, longe do oceano (≥ 25 px da costa)', () => {
    for (const { l, poly } of polys) {
      for (const [x, y] of poly) expect(elevacao(x, y), `${l.id} vértice`).toBeGreaterThan(0)
      const d = Math.min(...poly.map(([x, y]) => distanciaCosta(elevacao, x, y, 300)))
      expect(d, `${l.id} a ${d}px da costa`).toBeGreaterThanOrEqual(25)
    }
  })

  it('lagos não se sobrepõem nem se tocam (≥ 20 px entre eles)', () => {
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const d = Math.min(...polys[i]!.poly.map(([x, y]) => distanciaAoPoligono(x, y, polys[j]!.poly)))
        expect(d, `${polys[i]!.l.id} x ${polys[j]!.l.id}`).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('nenhum marcador de lugar fica dentro de um lago (o ponto central fica fora da água)', () => {
    for (const { l, poly } of polys) {
      for (const p of lugares) {
        expect(dentroDoPoligono(p.x * MAP_W, p.y * MAP_H, poly), `${p.id} dentro de ${l.id}`).toBe(false)
        expect(distanciaAoPoligono(p.x * MAP_W, p.y * MAP_H, poly), `${p.id} x ${l.id}`).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('o lago do Eyllwe usa o contorno lido do impresso e a forma desenhada o acompanha de perto', () => {
    const l = lagos.find((x) => x.id === 'lago-eyllwe-norte')!
    expect(l.contorno!.length).toBeGreaterThanOrEqual(20)
    const lido = l.contorno!.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H }))
    const closed = [...lido, lido[0]!]
    for (const [x, y] of lagoPoligono(l)) expect(distanciaAoCurso(x, y, closed), 'ponto do lago longe do contorno lido').toBeLessThanOrEqual(6)
    // not a symmetric ellipse: the top is broad and the bottom a rounded tip
    const largura = (yMin: number, yMax: number) => {
      const xs = lagoPoligono(l).filter(([, y]) => y >= yMin * MAP_H && y <= yMax * MAP_H).map(([x]) => x)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(largura(0.664, 0.68)).toBeGreaterThan(largura(0.725, 0.74) * 1.4)
  })

  it('a forma é orgânica e determinística, no tamanho lido do impresso', () => {
    const l = lagos.find((x) => x.id === 'lago-eyllwe-norte')!
    const a = lagoPoligono(l)
    const b = lagoPoligono(l)
    expect(a).toEqual(b)
    const xs = a.map((q) => q[0])
    const ys = a.map((q) => q[1])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.036 * MAP_W)
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.055 * MAP_W)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.07 * MAP_H)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.1 * MAP_H)
  })
})

describe('hidrografia: rios', () => {
  const rios = ativos('media').rios
  const todosAtivos = (id: string) => [...HIDROGRAFIA.rios, ...HIDROGRAFIA.candidatos].find((r) => r.id === id)
  const curso = (r: RioDef) => rioPontos(r, MAP_W, MAP_H, at)

  it('todo rio declara onde nasce e onde termina (nenhum fim sem justificativa)', () => {
    for (const r of HIDROGRAFIA.rios) {
      expect(r.nascente.length, r.id).toBeGreaterThan(3)
      expect(['mar', 'lago', 'juncao', 'fim-no-impresso'], r.id).toContain(r.foz.tipo)
    }
  })

  it('"fim no impresso" só vale com explicação e nunca para elemento de alta confiança', () => {
    for (const r of HIDROGRAFIA.rios.filter((x) => x.foz.tipo === 'fim-no-impresso')) {
      expect((r.foz as { ref: string }).ref.length, r.id).toBeGreaterThan(20)
      expect(r.confianca, r.id).not.toBe('alta')
    }
  })

  it('a foz declarada bate com a geometria: mar na água, lago no lago, junção em outro curso', () => {
    for (const r of HIDROGRAFIA.rios) {
      const pts = curso(r)
      const fim = pts[pts.length - 1]!
      if (r.foz.tipo === 'mar') expect(at(Math.round(fim.x), Math.round(fim.y)), r.id).toBeLessThanOrEqual(0)
      if (r.foz.tipo === 'lago') {
        const lago = HIDROGRAFIA.lagos.find((l) => l.id === (r.foz as { com: string }).com)!
        expect(distanciaAoPoligono(fim.x, fim.y, lagoPoligono(lago)), r.id).toBeLessThanOrEqual(8)
      }
      if (r.foz.tipo === 'juncao') {
        const alvo = todosAtivos(r.foz.com)
        expect(alvo, `${r.id} -> ${r.foz.com}`).toBeDefined()
        const alvoPts = 'foz' in alvo! ? curso(alvo as RioDef) : (alvo as { pontos: [number, number][] }).pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H }))
        expect(distanciaAoCurso(fim.x, fim.y, alvoPts), `${r.id} -> ${r.foz.com}`).toBeLessThanOrEqual(12)
      }
    }
  })

  it('nenhum rio atravessa o mar: só a foz marítima pode tocar a água', () => {
    for (const r of rios) {
      const pts = curso(r)
      const fim = r.foz.tipo === 'mar' ? 3 : 0
      for (const q of pts.slice(0, pts.length - fim)) expect(at(Math.round(q.x), Math.round(q.y)), `${r.id}`).toBeGreaterThan(0)
    }
  })

  it('rios não passam por dentro de lagos que não sejam a sua foz', () => {
    const polys = ativos('media').lagos.map((l) => ({ id: l.id, poly: lagoPoligono(l) }))
    for (const r of rios) {
      for (const q of curso(r)) {
        for (const { id, poly } of polys) {
          const permitido = r.foz.tipo === 'lago' && r.foz.com === id
          if (!permitido) expect(dentroDoPoligono(q.x, q.y, poly), `${r.id} dentro de ${id}`).toBe(false)
        }
      }
    }
  })

  it('nenhum rio passa por baixo do ícone de um lugar (≥ 14 px), exceto a cidade onde ele nasce', () => {
    for (const r of rios) {
      const pts = curso(r)
      for (const p of lugares) {
        if (r.nasce_em === p.id) continue
        expect(distanciaAoCurso(p.x * MAP_W, p.y * MAP_H, pts), `${r.id} x ${p.id}`).toBeGreaterThanOrEqual(14)
      }
    }
  })

  it('só se aceita nascer num lugar que existe', () => {
    for (const r of HIDROGRAFIA.rios.filter((x) => x.nasce_em)) expect(lugares.some((p) => p.id === r.nasce_em), r.id).toBe(true)
  })

  it('o rio gerado que um rio lido substitui sai do mapa', () => {
    expect(ativos('media').substituidos.has('melisande-1')).toBe(true)
    expect(ativos('alta').substituidos.has('melisande-1')).toBe(false)
  })
})

describe('rio de Orynth (experimental): segue a evidência, sem acréscimos', () => {
  const rio = HIDROGRAFIA.rios.find((r) => r.id === 'rio-orynth')!
  const orynth = lugares.find((p) => p.id === 'orynth')!
  const curso = rioPontos(rio, MAP_W, MAP_H, at)
  const lido = rio.pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H }))

  it('é experimental, nasce em Orynth e desemboca no mar', () => {
    expect(rio.experimental).toBe(true)
    expect(rio.nasce_em).toBe('orynth')
    expect(rio.foz.tipo).toBe('mar')
    expect(rio.nome).toBeNull()
    expect(rio.confianca).toBe('alta')
  })

  it('a posição de Orynth não foi alterada e o rio começa nela', () => {
    expect([orynth.x, orynth.y]).toEqual([0.747, 0.157])
    const ini = curso[0]!
    expect(Math.hypot(ini.x - orynth.x * MAP_W, ini.y - orynth.y * MAP_H)).toBeLessThan(12)
  })

  it('o curso desenhado nunca se afasta mais de 10 px da linha dos pontos lidos (nenhuma curva arbitrária)', () => {
    for (const q of curso.slice(0, curso.length - 3)) expect(distanciaAoCurso(q.x, q.y, lido)).toBeLessThanOrEqual(10)
  })

  it('o rio fica em terra até a foz e a foz cai na costa aprovada', () => {
    const fim = curso[curso.length - 1]!
    expect(at(Math.round(fim.x), Math.round(fim.y))).toBeLessThanOrEqual(0)
    const ult = lido[lido.length - 1]!
    expect(distanciaCosta(elevacao, ult.x, ult.y, 300)).toBeLessThanOrEqual(25)
  })

  it('não há afluentes: nenhum outro curso se junta a ele, e a saída do lago de Perranth segue desativada', () => {
    expect(HIDROGRAFIA.rios.filter((r) => r.foz.tipo === 'juncao' && (r.foz as { com: string }).com === 'rio-orynth')).toEqual([])
    expect(ativos('media').rios.map((r) => r.id)).not.toContain('saida-perranth')
  })

  it('o rio não toca o lago de Perranth', () => {
    const lago = lagoPoligono(HIDROGRAFIA.lagos.find((l) => l.id === 'lago-perranth')!)
    for (const q of curso) expect(distanciaAoPoligono(q.x, q.y, lago)).toBeGreaterThanOrEqual(20)
  })
})

describe('hidrografia: rotas de viagem não atravessam lagos', () => {
  const rotas = rotasJson as Route[]
  const polys = ativos('media').lagos.map((l) => ({ id: l.id, poly: lagoPoligono(l) }))

  it('nenhuma rota passa por dentro de um lago, nem a menos de 6 px da margem (exceto nas pontas, em lugares)', () => {
    for (const r of rotas) {
      const pts = r.pontos.map(([x, y]) => ({ x: x * MAP_W, y: y * MAP_H }))
      for (let i = 1; i < pts.length; i++) {
        for (let t = 0; t <= 1; t += 0.05) {
          const x = pts[i - 1]!.x + (pts[i]!.x - pts[i - 1]!.x) * t
          const y = pts[i - 1]!.y + (pts[i]!.y - pts[i - 1]!.y) * t
          for (const { id, poly } of polys) {
            expect(dentroDoPoligono(x, y, poly), `${r.id} dentro de ${id}`).toBe(false)
            // the first/last stretch starts on a place that may sit beside a lake (Anielle, Perranth)
            const ponta = (i === 1 && t < 0.1) || (i === pts.length - 1 && t > 0.9)
            if (!ponta) expect(distanciaAoPoligono(x, y, poly), `${r.id} x ${id}`).toBeGreaterThanOrEqual(6)
          }
        }
      }
    }
  })
})

describe('hidrografia: montanhas, árvores e água não se sobrepõem', () => {
  const hidro = ativos('media')
  const lagos = hidro.lagos.map((l) => lagoPoligono(l))
  const rios = hidro.rios.map((r) => rioPontos(r, MAP_W, MAP_H, at))
  const obst = criarObstaculos(lagos, rios)
  const campo = buildField(MAP_W, MAP_H, ruido)
  const planejar = (o?: typeof obst) => planejarGlifos({ W: MAP_W, H: MAP_H, at, rnd: mulberry32(5), noise: ruido }, campo, o)

  it('nenhum símbolo cai sobre um lago ou um rio', () => {
    for (const g of planejar(obst)) expect(obst.perto(g.x, g.y, 6 + g.tam * 0.8), `${g.tipo} em (${g.x | 0}, ${g.y | 0})`).toBe(false)
  })

  it('o teste é significativo: sem obstáculos haveria símbolos sobre a água', () => {
    const sem = planejar()
    const com = planejar(obst)
    expect(sem.length).toBeGreaterThan(com.length)
    expect(sem.some((g) => obst.perto(g.x, g.y, 6 + g.tam * 0.8))).toBe(true)
  })

  it('o resto do mapa mantém o desenho: remover obstáculos só retira símbolos, não muda os demais', () => {
    const chave = (g: { x: number; y: number; tipo: string }) => `${g.tipo}@${g.x.toFixed(2)},${g.y.toFixed(2)}`
    const com = new Set(planejar(obst).map(chave))
    for (const g of planejar()) {
      if (!obst.perto(g.x, g.y, 6 + g.tam * 0.8)) expect(com.has(chave(g)), chave(g)).toBe(true)
    }
  })
})

describe('costa aprovada: a hidrografia não pode alterá-la por acidente', () => {
  // Fingerprint of the approved v3 coast (160x112 land/water grid, FNV-1a). If it changes, the coast
  // changed: that needs the author's approval, then update this value on purpose.
  const IMPRESSAO = '9e05e5c1'
  const TERRA = 10850

  it('a impressão digital da costa v3 continua a mesma', () => {
    let bits = ''
    for (let j = 0; j < 112; j++) for (let i = 0; i < 160; i++) bits += elevacao(((i + 0.5) / 160) * MAP_W, ((j + 0.5) / 112) * MAP_H) > 0 ? '1' : '0'
    let h = 2166136261
    for (let i = 0; i < bits.length; i++) {
      h ^= bits.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    expect((h >>> 0).toString(16), 'a costa aprovada mudou').toBe(IMPRESSAO)
    expect(bits.split('1').length - 1).toBe(TERRA)
  })

  it('lagos são uma camada por cima da terra: a elevação não conhece a hidrografia', () => {
    // sample the middle of the Eyllwe lake: still land in the elevation field
    const l = ativos('alta').lagos.find((x) => x.id === 'lago-eyllwe-norte')!
    expect(elevacao(l.centro[0] * MAP_W, l.centro[1] * MAP_H)).toBeGreaterThan(0)
  })
})
