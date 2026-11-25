// Runs the browser suite in "generate" modes without depending on shell-specific env syntax (Windows + Git Bash + PowerShell).
//   node tests/navegador/executar.mjs golden   -> writes the local pixel goldens from the CURRENT code
//   node tests/navegador/executar.mjs mestre   -> rewrites mestre.json from the CURRENT code (only after an APPROVED change)
import { spawnSync } from 'node:child_process'

const modo = process.argv[2]
const env = { ...process.env }
if (modo === 'golden') env.GERAR_GOLDEN = '1'
else if (modo === 'mestre') env.GERAR_MESTRE = '1'
else {
  console.error('uso: node tests/navegador/executar.mjs golden|mestre')
  process.exit(2)
}
const r = spawnSync('npx', ['playwright', 'test', '-c', 'tests/navegador/playwright.config.ts'], { stdio: 'inherit', env, shell: true })
process.exit(r.status ?? 1)
