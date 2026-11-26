// Used by the pre-push hook: refuses a push unless the validation gate sealed exactly the commits being pushed.
// Git passes one line per pushed ref on stdin: "<local ref> <local sha> <remote ref> <remote sha>".
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ZERO = /^0+$/
const linhas = readFileSync(0, 'utf8').split('\n').filter(Boolean)
const arq = join(RAIZ, '.portao', 'ultimo.json')
const selo = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : null

function recusar(msg) {
  console.error(`\nPUSH RECUSADO: ${msg}\nRode o portão completo e publique com:  npm run publicar\n(o selo só é emitido com testes, build e navegador passando e a árvore limpa).`)
  process.exit(1)
}

for (const l of linhas) {
  const [, local] = l.split(' ')
  if (!local || ZERO.test(local)) continue // deleting a remote ref is not a publication of code
  if (!selo) recusar('não existe selo do portão (.portao/ultimo.json).')
  if (!selo.ok || !selo.completo) recusar(`o último portão NÃO passou por completo (commit ${String(selo.commit).slice(0, 7)}, ${selo.quando}).`)
  if (selo.commit === local) continue
  // an older commit that the sealed commit already contains is fine (e.g. pushing a tag of an already validated commit)
  const anc = spawnSync('git', ['merge-base', '--is-ancestor', local, selo.commit], { cwd: RAIZ })
  if (anc.status !== 0) recusar(`o commit ${local.slice(0, 7)} não foi validado (o selo é do commit ${String(selo.commit).slice(0, 7)}).`)
}
