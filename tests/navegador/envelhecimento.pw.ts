/**
 * R9 (step 0b): the analytic vignette (`vinhetaEm`, used to tint the vector symbols) against the vignette really painted on a
 * canvas (`desenharVinheta`, used by both rasters). For each mode and four base colours, a full-size canvas is filled with the
 * base colour, the vignette is painted, and ~1,600 points are read back and compared with `base * (1 - a) + rgb * a`.
 * Two interpolation models are reported (non-premultiplied, the one `vinhetaEm` assumes, and premultiplied) so that a
 * difference is attributed to its cause instead of being waved away as "rounding".
 */
import { expect, test } from '@playwright/test'

test('a vinheta analÃ­tica reproduz a vinheta desenhada no canvas (sÃ©pia e colorido)', async ({ page }) => {
  await page.goto('/tests/navegador/pagina.html')
  const rel = await page.evaluate(async () => {
    const E = await import('/src/lib/envelhecimento.ts')
    const W = 2400
    const H = 1680
    const bases: [number, number, number][] = [[255, 255, 255], [128, 128, 128], [20, 30, 40], [232, 214, 170]]
    const saida: Record<string, unknown> = {}
    for (const modo of ['sepia', 'cor'] as const) {
      const p = E.VINHETA[modo]
      for (const base of bases) {
        const cv = document.createElement('canvas')
        cv.width = W
        cv.height = H
        const ctx = cv.getContext('2d')!
        ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`
        ctx.fillRect(0, 0, W, H)
        E.desenharVinheta(ctx, W, H, modo)
        const d = ctx.getImageData(0, 0, W, H).data
        let n = 0
        let maxNP = 0, somaNP = 0, maxP = 0, somaP = 0
        const hist = { '0': 0, '1': 0, '2': 0, '3+': 0 }
        let pior: { x: number; y: number; t: number } = { x: 0, y: 0, t: 0 }
        let internoExato = true
        for (let y = 30; y < H; y += 60) {
          for (let x = 30; x < W; x += 60) {
            const v = E.vinhetaEm(x, y, W, H, modo)
            const t = v.a / p.alfa
            const i = (y * W + x) * 4
            let dNP = 0
            let dP = 0
            for (let c = 0; c < 3; c++) {
              const esperadoNP = base[c]! * (1 - v.a) + v.rgb[c]! * v.a
              const esperadoP = base[c]! * (1 - v.a) + p.ate[c]! * v.a // premultiplied: the colour is the end colour at every t
              dNP = Math.max(dNP, Math.abs(d[i + c]! - esperadoNP))
              dP = Math.max(dP, Math.abs(d[i + c]! - esperadoP))
            }
            if (t === 0 && (d[i] !== base[0] || d[i + 1] !== base[1] || d[i + 2] !== base[2])) internoExato = false
            n++
            somaNP += dNP
            somaP += dP
            if (dNP > maxNP) {
              maxNP = dNP
              pior = { x, y, t }
            }
            maxP = Math.max(maxP, dP)
            const r = Math.round(dNP)
            hist[r === 0 ? '0' : r === 1 ? '1' : r === 2 ? '2' : '3+']++
          }
        }
        saida[`${modo} base ${base.join(',')}`] = { pontos: n, naoPremultiplicado: { max: +maxNP.toFixed(2), media: +(somaNP / n).toFixed(3) }, premultiplicado: { max: +maxP.toFixed(2), media: +(somaP / n).toFixed(3) }, histogramaArredondado: hist, piorPonto: pior, internoExato }
      }
    }
    return saida
  })
  test.info().annotations.push({ type: 'relatorio', description: JSON.stringify(rel) })
  console.log(JSON.stringify(rel, null, 1))
  for (const [nome, r] of Object.entries(rel) as [string, { naoPremultiplicado: { max: number }; internoExato: boolean }][]) {
    expect(r.internoExato, `${nome}: dentro do raio interno o canvas nÃ£o pode alterar o pixel`).toBe(true)
    expect(r.naoPremultiplicado.max, `${nome}: diferenÃ§a mÃ¡xima entre a vinheta analÃ­tica e a do canvas (de 0 a 255)`).toBeLessThanOrEqual(LIMITE)
  }
})

/** Filled in from the first measurement (see the report in the consolidation document, section 9). */
const LIMITE = 2
