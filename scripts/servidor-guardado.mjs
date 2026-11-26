// Starts the Vite dev server for the validation gate and GUARANTEES it dies with its owner.
//   node scripts/servidor-guardado.mjs <porta> <pid-do-dono>
// The server is a child of this guard. The guard polls the owner's PID once a second: if the owner is gone (normal exit, error,
// Ctrl+C or a hard kill) it kills ITS OWN Vite process tree (and nothing else) and exits. It also exits when Vite exits.
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [porta, donoStr] = process.argv.slice(2)
const dono = Number(donoStr)
if (!porta || !dono) {
  console.error('uso: node scripts/servidor-guardado.mjs <porta> <pid-do-dono>')
  process.exit(2)
}

const vite = spawn(process.execPath, [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', porta, '--strictPort'], { cwd: RAIZ, stdio: 'inherit' })

function matarArvore() {
  if (!vite.pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(vite.pid), '/T', '/F'], { stdio: 'ignore' })
  else {
    try {
      process.kill(vite.pid, 'SIGKILL')
    } catch {
      /* already gone */
    }
  }
}

const vivo = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

const relogio = setInterval(() => {
  if (!vivo(dono)) {
    matarArvore()
    process.exit(0)
  }
}, 1000)

vite.on('exit', (codigo) => {
  clearInterval(relogio)
  process.exit(codigo ?? 0)
})
for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sinal, () => {
    matarArvore()
    process.exit(0)
  })
}
process.on('exit', matarArvore)
