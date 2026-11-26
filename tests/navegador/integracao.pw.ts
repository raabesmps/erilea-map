/**
 * R8 (step 0d.3): integration of the vector layer with the raster, the map and the URL.
 * The second biome is SYNTHETIC (tests/fixtures/bioma-sintetico.ts) and is only composed here, through a test registry;
 * the production registry keeps Terrasen alone.
 */
import { expect, test, type Page } from '@playwright/test'

const W = 2400
const H = 1680
const APP = '/?livro=7&lang=pt&terrasen=AB'

async function abrirApp(page: Page, consulta = APP) {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await page.goto(consulta)
  await page.waitForSelector('.leaflet-image-layer', { state: 'attached', timeout: 120_000 })
  await page.waitForTimeout(2500)
  return erros
}

/** Rect of the VISIBLE raster and the VISIBLE symbol SVG, and the largest difference between them (px). */
const desvio = (page: Page) =>
  page.evaluate(() => {
    const vis = (e: Element) => getComputedStyle(e).visibility === 'visible'
    const img = [...document.querySelectorAll('.leaflet-terrasenImg-pane img')].find(vis)
    const svg = [...document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')].find(vis)
    if (!img || !svg) return null
    const a = img.getBoundingClientRect()
    const s = svg.getBoundingClientRect()
    return Math.max(Math.abs(s.left - a.left), Math.abs(s.top - a.top), Math.abs(s.width - a.width), Math.abs(s.height - a.height))
  })

test.describe.configure({ mode: 'serial' })

test('composição com o bioma sintético: sem duplicação, raster omite exatamente o que o vetor desenha (pixels exatos)', async ({ page }) => {
  await page.goto('/tests/navegador/pagina.html')
  const r = await page.evaluate(
    async ({ W, H }) => {
      const T = await import('/src/lib/terreno.ts')
      const R = await import('/src/lib/biomas/registro.ts')
      const V = await import('/src/lib/biomas/camada-vetorial.ts')
      const B = await import('/src/lib/proto/terrasen-bioma.ts')
      const S = await import('/tests/fixtures/bioma-sintetico.ts')
      S.SINTETICO.registrarGlifos()
      const registro = [B.TERRASEN, S.SINTETICO]
      const out: Record<string, unknown> = { producao: R.BIOMAS_REFINADOS.map((b) => b.id) }
      for (const [estilo, modo] of [['colorido', 'cor'], ['classico', 'sepia']] as const) {
        // case 1: both biomes in the raster; case 2: both in the vector layer; case 3: Terrasen raster + synthetic vector
        const ativos = (vT: boolean, vS: boolean) => [
          { bioma: B.TERRASEN, config: { estilo: 'A', estiloSepia: 'B', vetorial: vT } },
          { bioma: S.SINTETICO, config: { vetorial: vS } },
        ]
        const render = (vT: boolean, vS: boolean) => {
          let planos: { ativo: { bioma: { id: string } }; plano: { glifos: { x: number; y: number; tam: number }[] } }[] = []
          const cv = T.renderTerrain(W, H, 11, estilo, 'v3', 'alta', { ativos: ativos(vT, vS), registro, aoPlanejar: (p) => (planos = p as never) })
          return { d: cv.getContext('2d')!.getImageData(0, 0, W, H).data, planos }
        }
        const tudoRaster = render(false, false)
        const tudoVetor = render(true, true)
        const misto = render(false, true)
        const caixas = (glifos: { x: number; y: number; tam: number }[]) => {
          const m = new Uint8Array(W * H)
          for (const g of glifos) {
            const rr = 3 * g.tam + 12
            for (let y = Math.max(0, Math.floor(g.y - rr * 1.4)); y < Math.min(H, g.y + rr * 0.6); y++)
              for (let x = Math.max(0, Math.floor(g.x - rr)); x < Math.min(W, g.x + rr); x++) m[y * W + x] = 1
          }
          return m
        }
        const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray, mask: Uint8Array) => {
          let dentro = 0
          let fora = 0
          for (let i = 0; i < W * H; i++) {
            if (a[i * 4] === b[i * 4] && a[i * 4 + 1] === b[i * 4 + 1] && a[i * 4 + 2] === b[i * 4 + 2]) continue
            if (mask[i]) dentro++
            else fora++
          }
          return { dentro, fora }
        }
        const gT = tudoRaster.planos[0]!.plano.glifos
        const gS = tudoRaster.planos[1]!.plano.glifos
        const svgDois = V.construirSvgBiomas(tudoVetor.planos as never, modo, W, H, 1)
        const svgMisto = V.construirSvgBiomas(misto.planos as never, modo, W, H, 1)
        const contar = (svg: SVGSVGElement, b: string) => svg.querySelectorAll(`g[data-bioma="${b}"]`).length
        out[modo] = {
          simbolos: { terrasen: gT.length, sintetico: gS.length },
          // the plans do not depend on where the symbols are drawn
          planosIguais: JSON.stringify(tudoVetor.planos.map((p) => p.plano.glifos)) === JSON.stringify(tudoRaster.planos.map((p) => p.plano.glifos)),
          rasterSemOsDoisXcomOsDois: diff(tudoRaster.d, tudoVetor.d, caixas([...gT, ...gS])),
          mistoXcomOsDois: diff(tudoRaster.d, misto.d, caixas(gS)),
          svgDois: { terrasen: contar(svgDois, 'terrasen'), sintetico: contar(svgDois, 'sintetico'), total: svgDois.querySelectorAll('g[data-i]').length },
          svgMisto: { terrasen: contar(svgMisto, 'terrasen'), sintetico: contar(svgMisto, 'sintetico') },
        }
      }
      return out
    },
    { W, H },
  )
  expect(r.producao).toEqual(['terrasen'])
  for (const modo of ['cor', 'sepia']) {
    const m = r[modo] as {
      simbolos: { terrasen: number; sintetico: number }
      planosIguais: boolean
      rasterSemOsDoisXcomOsDois: { dentro: number; fora: number }
      mistoXcomOsDois: { dentro: number; fora: number }
      svgDois: { terrasen: number; sintetico: number; total: number }
      svgMisto: { terrasen: number; sintetico: number }
    }
    expect(m.simbolos.terrasen, modo).toBe(151)
    expect(m.simbolos.sintetico, modo).toBeGreaterThan(20)
    expect(m.planosIguais, modo).toBe(true)
    // the raster without the vector biomes differs from the full raster ONLY inside the symbols' boxes
    expect(m.rasterSemOsDoisXcomOsDois.fora, modo).toBe(0)
    expect(m.rasterSemOsDoisXcomOsDois.dentro, modo).toBeGreaterThan(0)
    expect(m.mistoXcomOsDois.fora, modo).toBe(0)
    expect(m.mistoXcomOsDois.dentro, modo).toBeGreaterThan(0)
    // the SVG draws exactly the symbols the raster left out, once each
    expect(m.svgDois, modo).toEqual({ terrasen: 151, sintetico: m.simbolos.sintetico, total: 151 + m.simbolos.sintetico })
    expect(m.svgMisto, modo).toEqual({ terrasen: 0, sintetico: m.simbolos.sintetico })
  }
})

test('ordem global de pintura entre biomas no SVG: y crescente, intercalação e numeração contínua', async ({ page }) => {
  await page.goto('/tests/navegador/pagina.html')
  const r = await page.evaluate(async () => {
    const T = await import('/src/lib/terreno.ts')
    const V = await import('/src/lib/biomas/camada-vetorial.ts')
    const B = await import('/src/lib/proto/terrasen-bioma.ts')
    const S = await import('/tests/fixtures/bioma-sintetico.ts')
    S.SINTETICO.registrarGlifos()
    let planos: unknown[] = []
    T.renderTerrain(2400, 1680, 11, 'colorido', 'v3', 'alta', {
      ativos: [
        { bioma: B.TERRASEN, config: { estilo: 'A', estiloSepia: 'B', vetorial: true } },
        { bioma: S.SINTETICO, config: { vetorial: true } },
      ],
      registro: [B.TERRASEN, S.SINTETICO],
      aoPlanejar: (p) => (planos = p),
    })
    const svg = V.construirSvgBiomas(planos as never, 'cor', 2400, 1680, 0)
    const gs = [...svg.querySelectorAll('g[data-i]')]
    return {
      ys: gs.map((g) => Number(g.getAttribute('data-y'))),
      is: gs.map((g) => Number(g.getAttribute('data-i'))),
      biomas: gs.map((g) => g.getAttribute('data-bioma')),
      filhosDiretos: svg.children.length,
      textoSemBioma: !V.textoDeReferencia(svg).includes('data-bioma'),
    }
  })
  expect(r.filhosDiretos).toBe(r.is.length) // one <g> per symbol, no per-biome group
  expect(r.is).toEqual(r.is.map((_, k) => k))
  for (let k = 1; k < r.ys.length; k++) expect(r.ys[k]!).toBeGreaterThanOrEqual(r.ys[k - 1]! - 0.05) // data-y is rounded to 0.1
  expect(r.biomas.every((b) => b === 'terrasen' || b === 'sintetico')).toBe(true)
  expect(r.biomas.filter((b, k) => k > 0 && b !== r.biomas[k - 1]).length).toBeGreaterThan(20)
  expect(r.textoSemBioma).toBe(true)
})

test('app: alinhamento SVG × raster de 0 px (zooms, pan e durante a animação de zoom) e símbolos identificados', async ({ page }) => {
  const erros = await abrirApp(page)
  const est = await page.evaluate(() => {
    const svg = document.querySelector('.leaflet-terrasenSimbolos-pane svg')!
    return { grupos: svg.querySelectorAll('g[data-i]').length, comBioma: svg.querySelectorAll('g[data-bioma="terrasen"]').length }
  })
  expect(est).toEqual({ grupos: 151, comBioma: 151 })
  const medidas: number[] = [(await desvio(page))!]
  for (let i = 0; i < 6; i++) {
    await page.click('.leaflet-control-zoom-in')
    await page.waitForTimeout(650)
    medidas.push((await desvio(page))!)
  }
  await page.mouse.move(640, 400)
  await page.mouse.down()
  await page.mouse.move(340, 330, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  medidas.push((await desvio(page))!)
  expect(Math.max(...medidas)).toBe(0)
  // frame by frame during zoom animations
  await page.evaluate(() => {
    const w = window as unknown as { __a: number[]; __l: number }
    w.__a = []
    const vis = (e: Element) => getComputedStyle(e).visibility === 'visible'
    const f = () => {
      const img = [...document.querySelectorAll('.leaflet-terrasenImg-pane img')].find(vis)
      const svg = [...document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')].find(vis)
      if (img && svg) {
        const a = img.getBoundingClientRect()
        const s = svg.getBoundingClientRect()
        w.__a.push(Math.max(Math.abs(s.left - a.left), Math.abs(s.top - a.top), Math.abs(s.width - a.width), Math.abs(s.height - a.height)))
      }
      w.__l = requestAnimationFrame(f)
    }
    f()
  })
  for (const b of ['out', 'out', 'in']) {
    await page.click(`.leaflet-control-zoom-${b}`)
    await page.waitForTimeout(800)
  }
  const anim = await page.evaluate(() => {
    const w = window as unknown as { __a: number[]; __l: number }
    cancelAnimationFrame(w.__l)
    return { quadros: w.__a.length, max: Math.max(...w.__a) }
  })
  expect(anim.quadros).toBeGreaterThan(20)
  expect(anim.max).toBe(0)
  expect(erros).toEqual([])
})

test('app: troca colorido ↔ sépia sem quadros incoerentes, e ordem das camadas', async ({ page }) => {
  const erros = await abrirApp(page)
  const camadas = await page.evaluate(() => {
    const z = (s: string) => Number(getComputedStyle(document.querySelector(s)!).zIndex)
    return { img: z('.leaflet-terrasenImg-pane'), simbolos: z('.leaflet-terrasenSimbolos-pane'), rotas: z('.leaflet-overlay-pane'), marcadores: z('.leaflet-marker-pane'), pointer: getComputedStyle(document.querySelector('.leaflet-terrasenSimbolos-pane svg')!).pointerEvents }
  })
  expect(camadas.img).toBeLessThan(camadas.simbolos)
  expect(camadas.simbolos).toBeLessThan(camadas.rotas)
  expect(camadas.rotas).toBeLessThan(camadas.marcadores)
  expect(camadas.pointer).toBe('none')
  await page.evaluate(() => {
    const w = window as unknown as { __t: { q: number; inc: number; nada: number }; __l: number }
    w.__t = { q: 0, inc: 0, nada: 0 }
    const idx = (n: Element[]) => n.findIndex((e) => getComputedStyle(e).visibility === 'visible')
    const f = () => {
      const imgs = [...document.querySelectorAll('.leaflet-terrasenImg-pane img')]
      const svgs = [...document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')]
      if (imgs.length && imgs.length === svgs.length) {
        w.__t.q++
        const a = idx(imgs)
        const b = idx(svgs)
        if (a !== b) w.__t.inc++
        if (a < 0 && b < 0) w.__t.nada++
      }
      w.__l = requestAnimationFrame(f)
    }
    f()
  })
  await page.click('text=Sépia')
  await page.waitForSelector('.painting', { state: 'detached', timeout: 120_000 }).catch(() => undefined)
  await page.waitForTimeout(500)
  for (const b of ['Colorido', 'Sépia', 'Colorido']) {
    await page.click(`text=${b}`)
    await page.waitForTimeout(600)
  }
  const t = await page.evaluate(() => {
    const w = window as unknown as { __t: { q: number; inc: number; nada: number }; __l: number }
    cancelAnimationFrame(w.__l)
    return w.__t
  })
  expect(t.q).toBeGreaterThan(30)
  expect(t.inc).toBe(0)
  expect(t.nada).toBe(0)
  const modos = await page.evaluate(() => [...document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')].map((s) => (s as SVGSVGElement).dataset.modo))
  expect(modos.sort()).toEqual(['cor', 'sepia'])
  expect(erros).toEqual([])
})

test('app: zoom, busca, marcador, arrastar e rota animada funcionam com a camada vetorial', async ({ page }) => {
  const erros = await abrirApp(page)
  const largura = () => page.evaluate(() => Math.round([...document.querySelectorAll('.leaflet-terrasenImg-pane img')].find((e) => getComputedStyle(e).visibility === 'visible')!.getBoundingClientRect().width))
  const w0 = await largura()
  await page.click('.leaflet-control-zoom-in')
  await page.waitForTimeout(700)
  expect(await largura()).toBeGreaterThan(w0)
  await page.fill('input[type=search]', 'orynth')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2600)
  expect(await page.locator('.card').count()).toBe(1)
  await page.click('.card .close')
  await page.waitForTimeout(300)
  const pino = await page.evaluate(() => {
    const m = [...document.querySelectorAll('.leaflet-marker-pane .leaflet-marker-icon')].find((e) => (e.getAttribute('title') ?? '').toLowerCase() === 'orynth')!
    const r = m.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.leaflet-marker-icon'), pino)).toBe(true)
  await page.mouse.click(pino.x, pino.y)
  await page.waitForTimeout(800)
  expect(await page.locator('.card').count()).toBe(1)
  await page.click('.card .close')
  const antes = await page.evaluate(() => (document.querySelector('.leaflet-map-pane') as HTMLElement).style.transform)
  await page.mouse.move(700, 300)
  await page.mouse.down()
  await page.mouse.move(600, 250, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => (document.querySelector('.leaflet-map-pane') as HTMLElement).style.transform)).not.toBe(antes)
  await page.click('text=De Anielle a Orynth')
  await page.waitForTimeout(2000)
  expect(await page.locator('.traveler').count()).toBe(1)
  expect(erros).toEqual([])
})

test('compatibilidade das URLs existentes', async ({ page }) => {
  const casos: [string, { svgs: number; grupos: number }][] = [
    ['/?livro=7&lang=pt', { svgs: 0, grupos: 0 }],
    ['/?livro=7&lang=pt&terrasen=AB', { svgs: 1, grupos: 151 }],
    ['/?livro=7&lang=pt&estilo=classico&terrasen=AB', { svgs: 1, grupos: 151 }],
    ['/?livro=7&lang=pt&terrasen=C&vetor=0', { svgs: 0, grupos: 0 }],
    ['/?livro=7&lang=pt&estilo=classico&terrasen=A&papel=2', { svgs: 1, grupos: 151 }],
    ['/?livro=7&lang=pt&estilo=classico&terrasen=AB&vetor=0', { svgs: 0, grupos: 0 }],
    ['/?livro=7&lang=pt&terrasen=XYZ', { svgs: 0, grupos: 0 }],
  ]
  for (const [url, esperado] of casos) {
    const erros = await abrirApp(page, url)
    const r = await page.evaluate(() => {
      const svgs = document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')
      const svg = svgs[0] as SVGSVGElement | undefined
      return { svgs: svgs.length, grupos: svg ? svg.querySelectorAll('g[data-i]').length : 0, mascara: svg ? !!(svg.style.maskImage || (svg.style as unknown as { webkitMaskImage?: string }).webkitMaskImage) : false, search: location.search }
    })
    expect({ svgs: r.svgs, grupos: r.grupos }, url).toEqual(esperado)
    // the URL keeps every parameter it was opened with (the app rewrites only what it owns, in the same form)
    const pedidos = new URLSearchParams(url.slice(1))
    const atuais = new URLSearchParams(r.search)
    for (const [k, v] of pedidos) if (k !== 'terrasen' || ['A', 'B', 'C', 'AB'].includes(v)) expect(atuais.get(k), `${url}: ${k}`).toBe(v)
    if (url.includes('estilo=classico') && esperado.svgs) expect(r.mascara, url).toBe(!url.includes('papel=0'))
    expect(erros, url).toEqual([])
  }
})
