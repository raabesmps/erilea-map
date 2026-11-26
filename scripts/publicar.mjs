// Publishes the current branch ONLY after the full validation gate passed, inside one process: there is no way to "push anyway".
//   npm run publicar                  -> git push origin <branch atual>
//   node scripts/publicar.mjs <remote> <branch>
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const git = (...a) => spawnSync('git', a, { cwd: RAIZ, encoding: 'utf8' })
const remoto = process.argv[2] ?? 'origin'
const ramo = process.argv[3] ?? git('branch', '--show-current').stdout.trim()
if (!ramo) {
  console.error('sem branch atual (HEAD solto): informe o branch.')
  process.exit(2)
}
if (git('status', '--porcelain').stdout.trim()) {
  console.error('há alterações não commitadas: commite antes de publicar (o portão valida o commit, não a árvore suja).')
  process.exit(1)
}
const gate = spawnSync(process.execPath, [join(RAIZ, 'scripts', 'portao.mjs')], { cwd: RAIZ, stdio: 'inherit' })
if (gate.status !== 0) {
  console.error(`\nO PORTÃO FALHOU (código ${gate.status}). Nada foi publicado.`)
  process.exit(gate.status || 1)
}
console.log(`\nportão OK: git push ${remoto} ${ramo}`)
const push = spawnSync('git', ['push', remoto, ramo], { cwd: RAIZ, stdio: 'inherit' })
process.exit(push.status ?? 1)
