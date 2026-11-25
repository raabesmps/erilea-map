import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W } from './geografia'
import { GRAO_PIXEL, HALO_SEPIA, TOM_QUENTE, VINHETA, vinhetaEm } from './envelhecimento'

describe('envelhecimento centralizado (etapa 0b): os parâmetros são exatamente os que estavam no código', () => {
  it('vinheta do sépia: raio 0,35 × lado curto até 0,72 × lado longo, de (120,80,30,0) a (90,52,18,0,55)', () => {
    expect(VINHETA.sepia).toEqual({ r0: 0.35, r1: 0.72, de: [120, 80, 30], ate: [90, 52, 18], alfa: 0.55 })
  })
  it('vinheta do colorido: raio 0,40 × lado curto até 0,72 × lado longo, até alfa 0,38', () => {
    expect(VINHETA.cor).toEqual({ r0: 0.4, r1: 0.72, de: [120, 80, 30], ate: [90, 52, 18], alfa: 0.38 })
  })
  it('grão por pixel: 9 no sépia e 8 no colorido; tom quente e halo do vetor sépia', () => {
    expect(GRAO_PIXEL).toEqual({ sepia: 9, cor: 8 })
    expect(TOM_QUENTE).toEqual([150, 112, 64])
    expect(HALO_SEPIA).toEqual([238, 226, 190])
  })
})

describe('vinhetaEm', () => {
  /** The function that used to live in papel-sepia.ts, copied verbatim, as an exact oracle. */
  const antiga = (x: number, y: number, W: number, H: number) => {
    const r0 = Math.min(W, H) * 0.35
    const r1 = Math.max(W, H) * 0.72
    const t = Math.min(1, Math.max(0, (Math.hypot(x - W / 2, y - H / 2) - r0) / (r1 - r0)))
    return { rgb: [120 + (90 - 120) * t, 80 + (52 - 80) * t, 30 + (18 - 30) * t], a: 0.55 * t }
  }
  it('no sépia dá EXATAMENTE os mesmos números da função anterior (bit a bit) em 1.700 pontos', () => {
    let n = 0
    for (let y = 0; y <= MAP_H; y += 40) {
      for (let x = 0; x <= MAP_W; x += 60) {
        const novo = vinhetaEm(x, y, MAP_W, MAP_H, 'sepia')
        const velho = antiga(x, y, MAP_W, MAP_H)
        expect(novo.rgb, `(${x},${y})`).toEqual(velho.rgb)
        expect(novo.a, `(${x},${y})`).toBe(velho.a)
        n++
      }
    }
    expect(n).toBeGreaterThan(1600)
  })
  it('0 no interior; alfa cheio só além do raio externo (fora do mapa: o canto chega a ≈ 77% dele); nos dois modos', () => {
    for (const modo of ['sepia', 'cor'] as const) {
      expect(vinhetaEm(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, modo).a).toBe(0)
      expect(vinhetaEm(-2000, -2000, MAP_W, MAP_H, modo).a).toBeCloseTo(VINHETA[modo].alfa, 10)
      const canto = vinhetaEm(0, 0, MAP_W, MAP_H, modo).a
      expect(canto).toBeGreaterThan(0.7 * VINHETA[modo].alfa)
      expect(canto).toBeLessThan(0.8 * VINHETA[modo].alfa)
    }
  })
  it('o colorido é mais leve que o sépia em todo o mapa', () => {
    for (const [x, y] of [[0, 0], [600, 300], [1800, 400], [2300, 1600]] as const)
      expect(vinhetaEm(x, y, MAP_W, MAP_H, 'cor').a).toBeLessThanOrEqual(vinhetaEm(x, y, MAP_W, MAP_H, 'sepia').a)
  })
})
