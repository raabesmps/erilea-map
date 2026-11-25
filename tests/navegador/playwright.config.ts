import { defineConfig } from '@playwright/test'

/**
 * Browser regression suite (layer R1, R3, ... of docs/biomas/CONSOLIDACAO-TECNICA.md).
 * Uses the installed Google Chrome (`channel: 'chrome'`), so no browser download is needed, and the Vite dev server.
 *   npm run test:navegador          compare against tests/navegador/mestre.json
 *   npm run golden:referencia       (re)write the local pixel goldens (gitignored) from the REFERENCE commit (git worktree)
 *   npm run mestre:atualizar -- --motivo "..."   DELIBERATE update of mestre.json (logged), only after an approved change
 * RAIZ_CODIGO / PORTA (set by the runner) make the dev server serve another checkout, e.g. the reference worktree.
 */
const PORTA = process.env.PORTA ?? '5191'
const RAIZ_CODIGO = process.env.RAIZ_CODIGO ?? '../..'
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.ts',
  timeout: 300_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './resultados',
  use: { baseURL: `http://localhost:${PORTA}`, channel: 'chrome', headless: true, viewport: { width: 1280, height: 760 } },
  webServer: {
    command: `npm run dev -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}/tests/navegador/pagina.html`,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: RAIZ_CODIGO,
  },
})
