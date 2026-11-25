// Runner for the two DELIBERATE operations of the browser suite (no shell-specific env syntax: works on Windows, Git Bash and PowerShell).
//
//   node tests/navegador/executar.mjs golden-referencia [commit]
//       Rebuilds the local pixel goldens from the REFERENCE commit (default: the one recorded in mestre.json, e34b710), served from a
//       temporary git worktree. A golden is written only if that code reproduces the master SHA-256, so a golden can never
//       be a copy of "whatever the working tree renders today".
//
//   node tests/navegador/executar.mjs mestre --motivo "why the approved values change"
//       Rewrites the values in mestre.json from the CURRENT code. It logs the reason, the commit and the old SHA-256 in
//       `atualizacoes`; `referencia` (the original approved values) is never touched. Use only after an APPROVED visual change.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, symlinkSync, copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '..', '..')
const CONFIG = 'tests/navegador/playwright.config.ts'
const git = (...args) => spawnSync('git', args, { cwd: RAIZ, encoding: 'utf8' })
const playwright = (env, cwd = RAIZ) => spawnSync('npx', ['playwright', 'test', '-c', join(RAIZ, CONFIG)], { cwd, stdio: 'inherit', env: { ...process.env, ...env }, shell: true })

const modo = process.argv[2]

if (modo === 'golden-referencia') {
  const mestre = JSON.parse(readFileSync(join(AQUI, 'mestre.json'), 'utf8'))
  const ref = process.argv[3] ?? mestre.referencia.commit
  const sha = git('rev-parse', '--verify', `${ref}^{commit}`)
  if (sha.status !== 0) {
    console.error(`commit de referência não encontrado: ${ref}`)
    process.exit(2)
  }
  const commit = sha.stdout.trim()
  const dir = join(AQUI, '.referencia')
  git('worktree', 'remove', '--force', dir)
  rmSync(dir, { recursive: true, force: true })
  const add = git('worktree', 'add', '--detach', dir, commit)
  if (add.status !== 0) {
    console.error(add.stderr)
    process.exit(2)
  }
  try {
    symlinkSync(join(RAIZ, 'node_modules'), join(dir, 'node_modules'), 'junction')
    mkdirSync(join(dir, 'tests', 'navegador'), { recursive: true })
    copyFileSync(join(AQUI, 'pagina.html'), join(dir, 'tests', 'navegador', 'pagina.html'))
    console.log(`goldens a partir de ${commit.slice(0, 7)} (worktree temporário em ${dir})`)
    const r = playwright({ GERAR_GOLDEN: '1', COMMIT_REFERENCIA: commit, RAIZ_CODIGO: dir, PORTA: '5192' })
    process.exitCode = r.status ?? 1
  } finally {
    rmSync(join(dir, 'node_modules'), { force: true })
    git('worktree', 'remove', '--force', dir)
    rmSync(dir, { recursive: true, force: true })
    git('worktree', 'prune')
  }
} else if (modo === 'mestre') {
  const i = process.argv.indexOf('--motivo')
  const motivo = i > 0 ? (process.argv[i + 1] ?? '') : ''
  if (motivo.trim().length < 10) {
    console.error('Informe o motivo (≥ 10 caracteres): npm run mestre:atualizar -- --motivo "mudança aprovada em ..."')
    process.exit(2)
  }
  if (!existsSync(join(AQUI, 'mestre.json'))) process.exit(2)
  console.log('ATENÇÃO: isto SUBSTITUI valores mestre aprovados pelos do código atual. Motivo registrado:', motivo)
  const r = playwright({ GERAR_MESTRE: '1', MOTIVO: motivo })
  process.exit(r.status ?? 1)
} else {
  console.error('uso: node tests/navegador/executar.mjs golden-referencia [commit] | mestre --motivo "..."')
  process.exit(2)
}
