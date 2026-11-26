/**
 * R1 + R3 (master regression): the full-resolution render of the map must stay bit-identical.
 * Compared per case: SHA-256 of the WHOLE RGBA buffer (2400 x 1680), the legacy sampled hash, the Terrasen plan hash and the
 * SVG text hash. On a mismatch the buffer is compared pixel by pixel with the local golden (if present) and the report lists
 * the number of differing pixels, the bounding box and the busiest regions, plus a diff PNG in ./resultados.
 *
 * Seed 11 is the approved geography. No other seed (1 to 400 were checked) passes the geography validators, so the extra seeds
 * below are STRESS seeds: they do not claim a valid map, they only catch code that silently depends on seed 11.
 */
import { expect, test, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { compararPixels, pngDiferencas } from './pixels'

const W = 2400
const H = 1680
const AQUI = fileURLToPath(new URL('.', import.meta.url))
const MESTRE = join(AQUI, 'mestre.json')
const GOLDEN = join(AQUI, 'golden')
const GERAR_MESTRE = process.env.GERAR_MESTRE === '1'
const GERAR_GOLDEN = process.env.GERAR_GOLDEN === '1'
/** Set ONLY by `npm run golden:referencia`, which serves the code of the reference commit from a temporary git worktree. */
const COMMIT_REFERENCIA = process.env.COMMIT_REFERENCIA ?? ''
/** Required by `npm run mestre:atualizar -- --motivo "..."`: why the approved master values are being replaced. */
const MOTIVO = process.env.MOTIVO ?? ''
const sha256Buf = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

type Estilo = 'colorido' | 'classico'
type Terrasen = 'nenhum' | 'raster' | 'vetorial'
interface Caso {
  seed: number
  estilo: Estilo
  terrasen: Terrasen
}
interface Medida {
  sha256: string
  amostra: string
  plano?: { n: number; hash: string }
  svg?: string
}

const chave = (c: Caso) => `${c.seed}|${c.estilo}|${c.terrasen}`
const arquivoGolden = (c: Caso) => join(GOLDEN, chave(c).replace(/\|/g, '_') + '.rgba.gz')

const SEMENTES_ESTRESSE = [184, 21, 37]
const casos: Caso[] = []
for (const estilo of ['colorido', 'classico'] as const) for (const terrasen of ['nenhum', 'raster', 'vetorial'] as const) casos.push({ seed: 11, estilo, terrasen })
for (const seed of SEMENTES_ESTRESSE) for (const estilo of ['colorido', 'classico'] as const) for (const terrasen of ['nenhum', 'raster'] as const) casos.push({ seed, estilo, terrasen })

async function renderizar(page: Page, c: Caso, comBuffer: boolean): Promise<Medida & { buffer?: string }> {
  return page.evaluate(
    async ({ seed, estilo, terrasen, comBuffer, W, H }) => {
      const T = await import('/src/lib/terreno.ts')
      const V = await import('/src/lib/biomas/camada-vetorial.ts')
      const R = await import('/src/lib/biomas/registro.ts')
      const fnv = (s: string) => {
        let x = 2166136261
        for (let i = 0; i < s.length; i++) {
          x ^= s.charCodeAt(i)
          x = Math.imul(x, 16777619) >>> 0
        }
        return x.toString(16)
      }
      let plano: { glifos: { tipo: string; x: number; y: number; tam: number; neve: boolean; rot: number; v: number; origem: string }[] } | undefined
      const proto =
        terrasen === 'nenhum' ? undefined : { estilo: 'A' as const, estiloSepia: 'B' as const, vetorial: terrasen === 'vetorial', aoPlanejar: (p: typeof plano) => (plano = p) }
      const cv = T.renderTerrain(W, H, seed, estilo, 'v3', 'alta', proto)
      const data = cv.getContext('2d')!.getImageData(0, 0, W, H).data
      const dig = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
      const sha256 = [...dig].map((b) => b.toString(16).padStart(2, '0')).join('')
      let x = 2166136261
      for (let i = 0; i < data.length; i += 7) {
        x ^= data[i]!
        x = Math.imul(x, 16777619) >>> 0
      }
      const out: { sha256: string; amostra: string; plano?: { n: number; hash: string }; svg?: string; buffer?: string } = { sha256, amostra: x.toString(16) }
      if (plano) {
        const lista = plano.glifos.map((g) => [g.tipo, +g.x.toFixed(1), +g.y.toFixed(1), +g.tam.toFixed(2), g.neve ? 1 : 0, +g.rot.toFixed(3), +g.v.toFixed(3), g.origem])
        out.plano = { n: plano.glifos.length, hash: fnv(JSON.stringify(lista)) }
        // the SVG is built by the generic builder (step 0d.1); the hash is of the text WITHOUT data-bioma, the original reference text
        const ativo = R.ativosDeProto({ estilo: 'A', estiloSepia: 'B', vetorial: true })[0]
        const svg = V.construirSvgBiomas([{ ativo, plano: plano as never, peso: () => 0 }], estilo === 'colorido' ? 'cor' : 'sepia', W, H, 1)
        out.svg = fnv(V.textoDeReferencia(svg))
      }
      if (comBuffer) {
        out.buffer = await new Promise<string>((res) => {
          const fr = new FileReader()
          fr.onload = () => res(String(fr.result).split(',')[1]!)
          fr.readAsDataURL(new Blob([data]))
        })
      }
      return out
    },
    { seed: c.seed, estilo: c.estilo, terrasen: c.terrasen, comBuffer, W, H },
  )
}

test.describe.configure({ mode: 'serial' })

let page: Page
const novos: Record<string, Medida> = {}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/tests/navegador/pagina.html')
})
const goldenGravados: Record<string, string> = {}

test.afterAll(async () => {
  if (GERAR_MESTRE) {
    // Deliberate update: the reference section stays untouched and every change is logged with a reason, the code commit and the old values.
    const atual = JSON.parse(readFileSync(MESTRE, 'utf8'))
    const alterados = Object.keys(novos).filter((k) => novos[k]!.sha256 !== atual.casos[k]?.sha256)
    const git = (c: string) => execSync(c, { cwd: join(AQUI, '..', '..') }).toString().trim()
    const registro = {
      em: new Date().toISOString(),
      commit: git('git rev-parse HEAD') + (git('git status --porcelain') ? '+alteracoes-nao-commitadas' : ''),
      motivo: MOTIVO,
      casosAlterados: alterados,
      sha256Anteriores: Object.fromEntries(alterados.map((k) => [k, atual.casos[k]?.sha256 ?? null])),
    }
    const mestre = { ...atual, atualizacoes: [...(atual.atualizacoes ?? []), registro], casos: { ...atual.casos, ...novos } }
    writeFileSync(MESTRE, JSON.stringify(mestre, null, 1) + '\n')
  }
  if (GERAR_GOLDEN && COMMIT_REFERENCIA && Object.keys(goldenGravados).length) {
    writeFileSync(join(GOLDEN, 'ORIGEM.json'), JSON.stringify({ commitDeReferencia: COMMIT_REFERENCIA, geradoEm: new Date().toISOString(), sha256: goldenGravados }, null, 1) + '\n')
  }
  await page?.close()
})

test('o comparador de pixels encontra uma diferença de 1 pixel e localiza a região', () => {
  const a = new Uint8Array(W * H * 4).fill(10)
  const b = new Uint8Array(a)
  expect(compararPixels(a, b, W, H).iguais).toBe(true)
  b[(500 * W + 700) * 4 + 1] = 13
  const r = compararPixels(a, b, W, H)
  expect(r.iguais).toBe(false)
  expect(r.pixelsDiferentes).toBe(1)
  expect(r.maiorDiferenca).toBe(3)
  expect(r.caixa).toEqual([700, 500, 700, 500])
  expect(r.celulas[0]).toEqual({ x: 640, y: 480, n: 1 })
  expect(() => compararPixels(a, new Uint8Array(8), W, H)).toThrow()
})

for (const c of casos) {
  test(`mestre ${chave(c)}`, async () => {
    const m = await renderizar(page, c, GERAR_GOLDEN)
    const mestre = JSON.parse(readFileSync(MESTRE, 'utf8')).casos as Record<string, Medida>
    if (GERAR_GOLDEN) {
      // A golden is a copy of an APPROVED render, never of whatever the working tree produces today.
      expect(COMMIT_REFERENCIA, 'goldens só são gravados por `npm run golden:referencia` (código do commit de referência)').toBeTruthy()
      expect(m.sha256, `o código servido (${COMMIT_REFERENCIA.slice(0, 7)}) não reproduz o valor mestre de ${chave(c)}: golden NÃO gravado`).toBe(mestre[chave(c)]?.sha256)
      mkdirSync(GOLDEN, { recursive: true })
      writeFileSync(arquivoGolden(c), gzipSync(Buffer.from(m.buffer!, 'base64'), { level: 6 }))
      goldenGravados[chave(c)] = m.sha256
    }
    const { buffer: _b, ...medida } = m
    void _b
    if (GERAR_MESTRE) {
      expect(MOTIVO.trim().length, 'informe o motivo: npm run mestre:atualizar -- --motivo "..."').toBeGreaterThan(9)
      novos[chave(c)] = medida
      return
    }
    const esperado = mestre[chave(c)]
    expect(esperado, `sem valor mestre para ${chave(c)}; rode npm run mestre:atualizar -- --motivo "..."`).toBeTruthy()
    if (medida.sha256 !== esperado!.sha256) {
      let relatorio = 'sem golden local para comparar pixel a pixel (rode npm run golden:referencia)'
      if (existsSync(arquivoGolden(c))) {
        const atual = Buffer.from((await renderizar(page, c, true)).buffer!, 'base64')
        const ref = gunzipSync(readFileSync(arquivoGolden(c)))
        // integrity: the golden must still be the approved render (its SHA-256 equals the master value)
        expect(sha256Buf(ref), `o golden de ${chave(c)} não corresponde ao valor mestre (arquivo velho ou corrompido): rode npm run golden:referencia`).toBe(esperado!.sha256)
        const r = compararPixels(new Uint8Array(ref), new Uint8Array(atual), W, H)
        mkdirSync(join(AQUI, 'resultados'), { recursive: true })
        writeFileSync(join(AQUI, 'resultados', `diff_${chave(c).replace(/\|/g, '_')}.png`), pngDiferencas(new Uint8Array(ref), new Uint8Array(atual), W, H))
        relatorio = `pixel a pixel: ${r.pixelsDiferentes} diferentes (${r.percentual}%), maior diferença ${r.maiorDiferenca}/255, caixa ${JSON.stringify(r.caixa)}, regiões ${JSON.stringify(r.celulas.slice(0, 4))}; diff em tests/navegador/resultados/`
      }
      throw new Error(`O MAPA MUDOU em ${chave(c)}. SHA-256 esperado ${esperado!.sha256}, obtido ${medida.sha256}. ${relatorio}`)
    }
    expect(medida.amostra).toBe(esperado!.amostra)
    expect(medida.plano).toEqual(esperado!.plano)
    expect(medida.svg).toBe(esperado!.svg)
  })
}

test('a renderização é determinística (duas execuções, mesmo SHA-256)', async () => {
  const c: Caso = { seed: 11, estilo: 'colorido', terrasen: 'raster' }
  const a = await renderizar(page, c, false)
  const b = await renderizar(page, c, false)
  expect(b.sha256).toBe(a.sha256)
  expect(b.plano).toEqual(a.plano)
})

test('em cada semente, colorido e sépia usam o mesmo plano de Terrasen', async () => {
  for (const seed of [11, ...SEMENTES_ESTRESSE]) {
    const cor = await renderizar(page, { seed, estilo: 'colorido', terrasen: 'raster' }, false)
    const sep = await renderizar(page, { seed, estilo: 'classico', terrasen: 'raster' }, false)
    expect(sep.plano, `semente ${seed}`).toEqual(cor.plano)
  }
})
