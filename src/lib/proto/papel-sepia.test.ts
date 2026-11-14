import { describe, expect, it } from 'vitest'
import { MAP_H, MAP_W } from '../geografia'
import { GravadorSvg } from './gravador-svg'
import { alfaGrao, lerCor, PARAMS_PAPEL, transformarCor, vinheta } from './papel-sepia'

describe('integração dos símbolos ao pergaminho sépia (experimental)', () => {
  it('lê hex e rgba', () => {
    expect(lerCor('#d9c9a0')).toEqual([217, 201, 160, 1])
    expect(lerCor('rgba(62,44,28,0.92)')).toEqual([62, 44, 28, 0.92])
    expect(lerCor('nope')).toBeNull()
  })
  it('a vinheta analítica é a de drawAging: 0 no centro, cresce até 0,55', () => {
    expect(vinheta(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H).a).toBe(0)
    const canto = vinheta(0, 0, MAP_W, MAP_H)
    expect(canto.a).toBeGreaterThan(0.4)
    expect(canto.a).toBeLessThanOrEqual(0.55)
  })
  it('a cor muda pouco e mantém a opacidade própria; o halo claro fica mais suave', () => {
    const f = transformarCor(1, 0.7 * MAP_W, 0.15 * MAP_H, MAP_W, MAP_H)
    const tinta = lerCor(f('rgba(62,44,28,0.92)'))!
    expect(tinta[3]).toBe(0.92)
    for (let i = 0; i < 3; i++) expect(Math.abs(tinta[i]! - [62, 44, 28][i]!)).toBeLessThan(30)
    expect(lerCor(f('rgba(238,226,190,0.8)'))![3]).toBeCloseTo(0.8 * PARAMS_PAPEL[1].halo, 3)
    const g = transformarCor(2, 0.7 * MAP_W, 0.15 * MAP_H, MAP_W, MAP_H)
    expect(lerCor(g('rgba(238,226,190,0.8)'))![3]).toBeLessThan(lerCor(f('rgba(238,226,190,0.8)'))![3]!)
  })
  it('o nível 2 é mais perceptível que o 1, mas discreto (< 30% de variação de alfa)', () => {
    expect(PARAMS_PAPEL[2].graoAmp).toBeGreaterThan(PARAMS_PAPEL[1].graoAmp)
    expect(PARAMS_PAPEL[2].opacidade).toBeLessThan(PARAMS_PAPEL[1].opacidade)
    for (const n of [1, 2] as const) for (const [a, b, c] of [[0, 0, 0], [1, 1, 1], [0.5, 0.5, 0.5]]) {
      const v = alfaGrao(n, a!, b!, c!)
      expect(v).toBeLessThanOrEqual(1)
      expect(v).toBeGreaterThanOrEqual(1 - PARAMS_PAPEL[n].graoAmp - 1e-9)
    }
    expect(1 - PARAMS_PAPEL[2].graoAmp).toBeGreaterThan(0.7)
  })
  it('o gravador só troca as cores: a geometria dos caminhos é idêntica com e sem integração', () => {
    const desenho = (r: GravadorSvg) => {
      r.beginPath(); r.moveTo(0, 0); r.lineTo(10, -20); r.lineTo(20, 0); r.closePath()
      r.fillStyle = '#d9c9a0'; r.fill(); r.strokeStyle = 'rgba(62,44,28,0.92)'; r.lineWidth = 1.4; r.stroke()
    }
    const a = new GravadorSvg(); desenho(a)
    const b = new GravadorSvg(transformarCor(2, 100, 100, MAP_W, MAP_H)); desenho(b)
    const d = (s: string[]) => s.map((e) => /d="([^"]*)"/.exec(e)![1])
    expect(d(b.elementos)).toEqual(d(a.elementos))
    expect(b.elementos[0]).not.toEqual(a.elementos[0])
  })
})
