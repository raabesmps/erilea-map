// R10 / step 0d.4: performance of the map with the vector layer, and an investigation of the long zoom frames.
// Measurement only (not part of the gate: timings depend on the machine). Same machine, same run, BEFORE and AFTER:
//   ref   = the approved reference e34b710 (served from a temporary git worktree, port 5192)
//   atual = the current HEAD (port 5191)
// Servers are started through scripts/servidor-guardado.mjs (they die with this script).
//
//   node tests/desempenho/medir-zoom.mjs [--rapido]      (--rapido: 2 repetitions instead of 5, for a dry run)
import { chromium } from '@playwright/test'
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const REF = 'e34b710fd729b6f0f1979dffaaa13990d971e401'
const N = process.argv.includes('--rapido') ? 2 : 5
const SAIDA = join(RAIZ, 'docs', 'biomas', 'desempenho')
const TRACES = join(RAIZ, '.portao', 'traces')
mkdirSync(SAIDA, { recursive: true })
mkdirSync(TRACES, { recursive: true })
const git = (...a) => spawnSync('git', a, { cwd: RAIZ, encoding: 'utf8' })
const servidores = []
const WT = join(RAIZ, 'tests', 'navegador', '.referencia')

function limpar() {
  for (const s of servidores) {
    try {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(s.pid), '/T', '/F'], { stdio: 'ignore' })
      else s.kill('SIGKILL')
    } catch {
      /* gone */
    }
  }
  servidores.length = 0
  try {
    rmSync(join(WT, 'node_modules'), { force: true })
  } catch {
    /* none */
  }
  git('worktree', 'remove', '--force', WT)
  git('worktree', 'prune')
}
process.on('exit', limpar)
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(130))

const aberta = (porta) =>
  new Promise((r) => {
    const c = createConnection({ port: porta, host: 'localhost' })
    c.once('connect', () => (c.destroy(), r(true)))
    c.once('error', () => r(false))
  })
async function subir(porta, cwd) {
  if (await aberta(porta)) throw new Error(`porta ${porta} ocupada`)
  const s = spawn(process.execPath, [join(RAIZ, 'scripts', 'servidor-guardado.mjs'), String(porta), String(process.pid)], { cwd, stdio: 'ignore' })
  servidores.push(s)
  for (let i = 0; i < 180; i++) {
    if (await aberta(porta)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`servidor ${porta} não subiu`)
}

const estat = (v) => {
  const a = [...v].sort((x, y) => x - y)
  const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))]
  return { n: a.length, mediana: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +a[a.length - 1].toFixed(2) }
}

/** Samples frame intervals (rAF) for `ms` after a zoom key press; returns the intervals in ms. */
async function zoomMedido(page, tecla, ms = 1100) {
  const p = page.evaluate(
    (ms) =>
      new Promise((res) => {
        const dts = []
        let last = performance.now()
        const t0 = last
        const f = () => {
          const n = performance.now()
          dts.push(n - last)
          last = n
          if (n - t0 < ms) requestAnimationFrame(f)
          else res(dts.slice(1))
        }
        requestAnimationFrame(f)
      }),
    ms,
  )
  await page.keyboard.press(tecla)
  return p
}

async function preparar(page, base, modo, svgEstado, mascara) {
  const t0 = Date.now()
  // throttled mobile emulation: the synchronous terrain render blocks 'load' for a long time, so wait for the commit only
  await page.goto(`${base}/?livro=7&lang=pt&terrasen=AB${modo === 'sepia' ? '&estilo=classico' : ''}`, { waitUntil: 'commit', timeout: 300_000 })
  await page.waitForSelector('.leaflet-terrasenSimbolos-pane svg', { state: 'attached', timeout: 240_000 })
  const tempoAteSvg = Date.now() - t0
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.leaflet-terrasenImg-pane img')].map((i) => i.decode().catch(() => undefined))))
  await page.waitForTimeout(1500)
  const info = await page.evaluate(
    ({ svgEstado, mascara }) => {
      const svgs = [...document.querySelectorAll('.leaflet-terrasenSimbolos-pane svg')]
      const svg = svgs.find((s) => getComputedStyle(s).visibility === 'visible') ?? svgs[0]
      const r = { caminhos: svg.querySelectorAll('path').length, kb: Math.round(svg.outerHTML.length / 1024), mascara: !!(svg.style.maskImage || svg.style.webkitMaskImage) }
      if (mascara === false) for (const s of svgs) (s.style.maskImage = ''), (s.style.webkitMaskImage = '')
      if (svgEstado === 'oculto') for (const s of svgs) s.style.visibility = 'hidden'
      if (svgEstado === 'ausente') for (const s of svgs) s.remove()
      return r
    },
    { svgEstado, mascara },
  )
  // focus the map for keyboard zoom (Leaflet: NumpadAdd / NumpadSubtract), clicking an empty corner
  await page.mouse.click(30, 700)
  await page.waitForTimeout(400)
  return { tempoAteSvg, ...info }
}

async function condicao(browser, base, { modo, svgEstado, mascara, mobile }) {
  const ctxOpts = mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 760 } }
  const frio = []
  const quente = []
  let info = null
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext(ctxOpts)
    const page = await ctx.newPage()
    if (mobile) {
      const cdp = await ctx.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: mobile })
    }
    info = await preparar(page, base, modo, svgEstado, mascara)
    frio.push(await zoomMedido(page, 'NumpadAdd'))
    await page.waitForTimeout(500)
    if (i === 0) {
      // warm: two unmeasured cycles, then N measured zoom-ins on the same page
      for (let k = 0; k < 2; k++) {
        await page.keyboard.press('NumpadSubtract')
        await page.waitForTimeout(700)
        await page.keyboard.press('NumpadAdd')
        await page.waitForTimeout(700)
      }
      for (let k = 0; k < N; k++) {
        await page.keyboard.press('NumpadSubtract')
        await page.waitForTimeout(800)
        quente.push(await zoomMedido(page, 'NumpadAdd'))
        await page.waitForTimeout(400)
      }
    }
    await ctx.close()
  }
  const resumo = (lista) => {
    const todos = lista.flat()
    return { ...estat(todos), longos33PorZoom: +(todos.filter((x) => x > 33.4).length / lista.length).toFixed(2), longos50PorZoom: +(todos.filter((x) => x > 50).length / lista.length).toFixed(2), maxPorZoom: lista.map((l) => +Math.max(...l).toFixed(1)) }
  }
  return { frio: resumo(frio), quente: resumo(quente), svg: { caminhos: info.caminhos, kb: info.kb, mascara: info.mascara }, tempoAteSvgMs: info.tempoAteSvg }
}

/** Chrome trace of one cold zoom; returns the longest events and the time per event name inside the zoom window. */
async function rastrear(browser, base, modo, svgEstado, nome) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } })
  const page = await ctx.newPage()
  await preparar(page, base, modo, svgEstado, undefined)
  const arq = join(TRACES, `${nome}.json`)
  await browser.startTracing(page, { path: arq, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink', 'cc', 'gpu', 'v8', 'loading'] })
  await zoomMedido(page, 'NumpadAdd', 1400)
  await browser.stopTracing()
  await ctx.close()
  const tr = JSON.parse(readFileSync(arq, 'utf8'))
  const ev = (tr.traceEvents ?? tr).filter((e) => e.ph === 'X' && e.dur)
  const nomesThread = {}
  for (const e of tr.traceEvents ?? tr) if (e.ph === 'M' && e.name === 'thread_name') nomesThread[`${e.pid}:${e.tid}`] = e.args.name
  const porNome = {}
  for (const e of ev) {
    const t = nomesThread[`${e.pid}:${e.tid}`] ?? '?'
    if (!/CrRendererMain|Compositor|CrGpuMain|VizCompositor|Raster/i.test(t)) continue
    const k = `${t} · ${e.name}`
    porNome[k] = (porNome[k] ?? 0) + e.dur / 1000
  }
  const topo = Object.entries(porNome).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => ({ evento: k, ms: +v.toFixed(1) }))
  const longos = ev
    .map((e) => ({ thread: nomesThread[`${e.pid}:${e.tid}`] ?? '?', nome: e.name, ms: +(e.dur / 1000).toFixed(1) }))
    .filter((e) => /CrRendererMain|Compositor|CrGpuMain|VizCompositor/i.test(e.thread) && e.ms >= 16 && !/^(ThreadControllerImpl::RunTask|RunTask|TaskQueueManager|MessageLoop|ProcessTask)/.test(e.nome))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 12)
  return { arquivo: arq, somaPorEvento: topo, eventosLongos: longos }
}

async function main() {
  // reference worktree
  git('worktree', 'remove', '--force', WT)
  rmSync(WT, { recursive: true, force: true })
  const add = git('worktree', 'add', '--detach', WT, REF)
  if (add.status !== 0) throw new Error(add.stderr)
  symlinkSync(join(RAIZ, 'node_modules'), join(WT, 'node_modules'), 'junction')
  mkdirSync(join(WT, 'scripts'), { recursive: true })
  copyFileSync(join(RAIZ, 'scripts', 'servidor-guardado.mjs'), join(WT, 'scripts', 'servidor-guardado.mjs'))
  await subir(5191, RAIZ)
  await subir(5192, WT)
  const browser = await chromium.launch({ channel: 'chrome' })
  const res = { quando: new Date().toISOString(), commitAtual: git('rev-parse', 'HEAD').stdout.trim(), commitRef: REF, repeticoes: N, navegador: browser.version(), desktop: {}, mobile: {}, hipoteses: {}, traces: {} }
  const bases = { ref: 'http://localhost:5192', atual: 'http://localhost:5191' }
  if (process.argv.includes('--render')) {
    // render time of renderTerrain itself (no page load), ref and atual ALTERNATING, inside an already loaded page of each build
    const pags = {}
    for (const build of ['ref', 'atual']) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } })
      pags[build] = await ctx.newPage()
      await pags[build].goto(`${bases[build]}/?livro=7&lang=pt`, { waitUntil: 'commit', timeout: 300_000 })
      await pags[build].waitForSelector('.leaflet-image-layer', { state: 'attached', timeout: 240_000 })
      await pags[build].waitForTimeout(1500)
    }
    const tempos = {}
    const casos = [['colorido', null], ['classico', null], ['colorido', 'vetorial'], ['classico', 'vetorial'], ['colorido', 'raster'], ['classico', 'raster']]
    for (let i = 0; i < 7; i++)
      for (const [estilo, t] of casos)
        for (const build of i % 2 === 0 ? ['ref', 'atual'] : ['atual', 'ref']) {
          const ms = await pags[build].evaluate(
            async ({ estilo, t }) => {
              const T = await import('/src/lib/terreno.ts')
              const proto = t ? { estilo: 'A', estiloSepia: 'B', vetorial: t === 'vetorial' } : undefined
              const t0 = performance.now()
              T.renderTerrain(2400, 1680, 11, estilo, 'v3', 'alta', proto)
              return performance.now() - t0
            },
            { estilo, t },
          )
          if (i > 0) (tempos[`${build}|${estilo}|${t ?? 'padrao'}`] ??= []).push(ms) // round 0 is warm-up
          process.stdout.write('.')
        }
    res.render = Object.fromEntries(Object.entries(tempos).map(([k, v]) => [k, estat(v)]))
    await browser.close()
    writeFileSync(join(SAIDA, '0d4-render.json'), JSON.stringify(res, null, 1) + '\n')
    console.log('\nresultado em', join(SAIDA, '0d4-render.json'))
    return
  }
  if (process.argv.includes('--alternado')) {
    // control for order effects: cold zooms with the SVG visible, ref and atual ALTERNATING (ref first on even rounds)
    const REP = 10
    const amostras = {}
    for (let i = 0; i < REP; i++)
      for (const modo of ['cor', 'sepia'])
        for (const build of i % 2 === 0 ? ['ref', 'atual'] : ['atual', 'ref']) {
          const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } })
          const page = await ctx.newPage()
          await preparar(page, bases[build], modo, 'ligado', undefined)
          ;(amostras[`${build}|${modo}`] ??= []).push(await zoomMedido(page, 'NumpadAdd'))
          await ctx.close()
          process.stdout.write('.')
        }
    const resumo = (lista) => {
      const todos = lista.flat()
      return { ...estat(todos), zooms: lista.length, longos50PorZoom: +(todos.filter((x) => x > 50).length / lista.length).toFixed(2), longos33PorZoom: +(todos.filter((x) => x > 33.4).length / lista.length).toFixed(2), maxPorZoom: lista.map((l) => +Math.max(...l).toFixed(1)) }
    }
    res.alternado = Object.fromEntries(Object.entries(amostras).map(([k, v]) => [k, resumo(v)]))
    await browser.close()
    writeFileSync(join(SAIDA, '0d4-alternado.json'), JSON.stringify(res, null, 1) + '\n')
    console.log('\nresultado em', join(SAIDA, '0d4-alternado.json'))
    return
  }
  // 1. desktop: before/after, both modes, SVG on / hidden / absent
  for (const build of ['ref', 'atual'])
    for (const modo of ['cor', 'sepia'])
      for (const svgEstado of ['ligado', 'oculto', 'ausente']) {
        const k = `${build}|${modo}|${svgEstado}`
        process.stdout.write(`desktop ${k} ... `)
        res.desktop[k] = await condicao(browser, bases[build], { modo, svgEstado })
        console.log('ok')
      }
  // 2. one hypothesis at a time (current build, desktop): the sepia grain mask on/off
  for (const mascara of [true, false]) {
    const k = `atual|sepia|ligado|mascara=${mascara}`
    process.stdout.write(`hipótese ${k} ... `)
    res.hipoteses[k] = await condicao(browser, bases.atual, { modo: 'sepia', svgEstado: 'ligado', mascara })
    console.log('ok')
  }
  // 3. mobile emulation with CPU throttling 4x and 6x (current build; before/after on the colour map)
  for (const cpu of [4, 6])
    for (const [build, modo, svgEstado] of [['atual', 'cor', 'ligado'], ['atual', 'cor', 'ausente'], ['atual', 'sepia', 'ligado'], ['ref', 'cor', 'ligado']]) {
      const k = `${build}|${modo}|${svgEstado}|cpu${cpu}x`
      process.stdout.write(`mobile ${k} ... `)
      res.mobile[k] = await condicao(browser, bases[build], { modo, svgEstado, mobile: cpu })
      console.log('ok')
    }
  // 4. traces of a cold zoom
  for (const [nome, modo, svgEstado] of [['atual-cor-ligado', 'cor', 'ligado'], ['atual-cor-ausente', 'cor', 'ausente'], ['atual-sepia-ligado', 'sepia', 'ligado']]) {
    process.stdout.write(`trace ${nome} ... `)
    res.traces[nome] = await rastrear(browser, bases.atual, modo, svgEstado, nome)
    console.log('ok')
  }
  await browser.close()
  writeFileSync(join(SAIDA, `0d4-medicoes${N === 5 ? '' : '-rapido'}.json`), JSON.stringify(res, null, 1) + '\n')
  console.log('resultado em', join(SAIDA, `0d4-medicoes${N === 5 ? '' : '-rapido'}.json`))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
