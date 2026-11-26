// VALIDATION GATE. Runs every check in order and stops at the first failure.
//   npm run portao            full gate: unit tests, build, browser regression
//   node scripts/portao.mjs --so unit,build      only some steps (never issues the publish seal)
//
// Rules that were missing before (step 0c.5):
//  * the exit code of EVERY step is read directly (no pipes or output filters in between) and any failure fails the gate;
//  * the COMPLETE output of every step is kept in .portao/logs/<run>/<step>.log, failed runs included (never overwritten);
//  * the dev server for the browser step is started by scripts/servidor-guardado.mjs, which kills it (only its own process
//    tree) when this script ends, fails, is interrupted or is killed; a port already in use is an error, never "reused" or killed;
//  * on success, and ONLY on success of the full gate with a clean working tree, it writes the seal .portao/ultimo.json that
//    the pre-push hook and `npm run publicar` require. A failed or partial run overwrites the seal with ok:false.
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORTA = process.env.PORTA_PORTAO ?? '5191'
const PASTA = join(RAIZ, '.portao')
const AGORA = new Date()
const RODADA = AGORA.toISOString().replace(/[:.]/g, '-')
const LOGS = join(PASTA, 'logs', RODADA)
mkdirSync(LOGS, { recursive: true })

const args = process.argv.slice(2)
const iSo = args.indexOf('--so')
const SO = iSo >= 0 ? (args[iSo + 1] ?? '').split(',').filter(Boolean) : null
const TODAS = ['unit', 'build', 'navegador']
const etapasPedidas = SO ?? TODAS
const completo = !SO

const git = (...a) => spawnSync('git', a, { cwd: RAIZ, encoding: 'utf8' })
const commit = () => git('rev-parse', 'HEAD').stdout.trim()
const sujo = () => git('status', '--porcelain').stdout.trim().length > 0
const resultado = { ok: false, completo, commit: commit(), arvoreLimpaNoInicio: !sujo(), quando: AGORA.toISOString(), logs: LOGS, etapas: [] }
let servidor = null

function selar(ok) {
  resultado.ok = ok
  mkdirSync(PASTA, { recursive: true })
  writeFileSync(join(PASTA, 'ultimo.json'), JSON.stringify(resultado, null, 1) + '\n')
  writeFileSync(join(LOGS, 'resultado.json'), JSON.stringify(resultado, null, 1) + '\n')
}

function encerrarServidor() {
  if (!servidor) return
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' })
    else servidor.kill('SIGKILL')
  } catch {
    /* already gone */
  }
  servidor = null
}

let finalizado = false
function terminar(codigo, motivo) {
  if (finalizado) return
  finalizado = true
  encerrarServidor()
  if (motivo) {
    resultado.interrompidoPor = motivo
    console.error(`\nPORTÃO INTERROMPIDO (${motivo}). Logs completos em ${LOGS}`)
  }
  // any non-zero end overwrites the seal with ok:false, so a failed or interrupted run can never leave an old OK behind
  if (codigo !== 0) selar(false)
  process.exit(codigo)
}
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => terminar(130, s))
process.on('uncaughtException', (e) => {
  console.error(e)
  terminar(1, 'erro não tratado: ' + (e?.message ?? e))
})
process.on('unhandledRejection', (e) => {
  console.error(e)
  terminar(1, 'promessa rejeitada: ' + (e?.message ?? e))
})
process.on('exit', encerrarServidor)

const portaOcupada = () =>
  new Promise((res) => {
    const c = createConnection({ port: Number(PORTA), host: 'localhost' })
    c.once('connect', () => (c.destroy(), res(true)))
    c.once('error', () => res(false))
  })

async function esperarServidor(ms = 90000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await portaOcupada()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

/** Runs a command with its COMPLETE stdout+stderr in a log file; returns the real exit code. */
function rodar(nome, linha, extraEnv = {}) {
  const arq = join(LOGS, `${nome}.log`)
  const fd = openSync(arq, 'w')
  console.log(`▶ ${nome} ...`)
  const t0 = Date.now()
  const r = spawnSync(linha, { cwd: RAIZ, stdio: ['ignore', fd, fd], shell: true, env: { ...process.env, ...extraEnv } })
  closeSync(fd)
  const codigo = r.status ?? (r.signal ? 1 : 1)
  resultado.etapas.push({ nome, codigo, segundos: +((Date.now() - t0) / 1000).toFixed(1), log: arq })
  console.log(`${codigo === 0 ? '✔' : '✘'} ${nome} (código ${codigo}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
  if (codigo !== 0) {
    const txt = readFileSync(arq, 'utf8')
    console.error(`--- últimas linhas de ${nome} (log completo: ${arq}) ---\n${txt.split('\n').slice(-25).join('\n')}`)
  }
  return codigo
}

async function main() {
  for (const e of etapasPedidas) if (!TODAS.includes(e)) terminar(2, `etapa desconhecida: ${e}`)
  if (etapasPedidas.includes('unit') && rodar('unit', 'npm test') !== 0) return terminar(1)
  if (etapasPedidas.includes('build') && rodar('build', 'npm run build') !== 0) return terminar(1)
  if (etapasPedidas.includes('navegador')) {
    if (await portaOcupada()) {
      console.error(`A porta ${PORTA} já está em uso. O portão NÃO reaproveita nem encerra servidores alheios; libere a porta ou use PORTA_PORTAO.`)
      resultado.etapas.push({ nome: 'servidor', codigo: 3, log: null })
      return terminar(1)
    }
    const fd = openSync(join(LOGS, 'servidor.log'), 'w')
    servidor = spawn(process.execPath, [join(RAIZ, 'scripts', 'servidor-guardado.mjs'), PORTA, String(process.pid)], { cwd: RAIZ, stdio: ['ignore', fd, fd] })
    if (!(await esperarServidor())) {
      console.error(`o servidor não subiu na porta ${PORTA}; veja ${join(LOGS, 'servidor.log')}`)
      resultado.etapas.push({ nome: 'servidor', codigo: 4, log: join(LOGS, 'servidor.log') })
      return terminar(1)
    }
    if (process.env.PORTAO_TESTE_ERRO_APOS_SERVIDOR === '1') throw new Error('erro proposital depois de subir o servidor (teste do portão)')
    // test hook (hard-kill demonstration): wait here so the process can be killed while the server is up
    if (process.env.PORTAO_TESTE_PAUSA === '1') await new Promise((r) => setTimeout(r, 120000))
    const c = rodar('navegador', `"${process.execPath}" "${join(RAIZ, 'node_modules', 'playwright', 'cli.js')}" test -c tests/navegador/playwright.config.ts`, { SERVIDOR_EXTERNO: '1', PORTA })
    encerrarServidor()
    if (c !== 0) return terminar(1)
  }
  const sujoNoFim = sujo()
  if (completo && (sujoNoFim || !resultado.arvoreLimpaNoInicio)) {
    console.error('\nA árvore de trabalho tem alterações não commitadas: o portão passou, mas NÃO emite o selo de publicação (o que foi testado não é o commit).')
    resultado.motivoSemSelo = 'árvore suja'
    selar(false)
    return terminar(1)
  }
  if (commit() !== resultado.commit) {
    console.error('\nHEAD mudou durante o portão: sem selo.')
    selar(false)
    return terminar(1)
  }
  selar(completo)
  console.log(`\n${completo ? 'PORTÃO COMPLETO: OK' : 'etapas pedidas: OK (parcial, sem selo de publicação)'}  commit ${resultado.commit.slice(0, 7)}  logs: ${LOGS}`)
  return terminar(0)
}

main().catch((e) => {
  console.error(e)
  terminar(1, 'erro: ' + (e?.message ?? e))
})
