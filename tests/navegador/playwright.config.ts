import { defineConfig } from '@playwright/test'

/**
 * Browser regression suite (layer R1, R3, ... of docs/biomas/CONSOLIDACAO-TECNICA.md).
 * Uses the installed Google Chrome (`channel: 'chrome'`), so no browser download is needed, and the Vite dev server.
 *   npm run test:navegador          compare against tests/navegador/mestre.json
 *   npm run golden:gerar            (re)write the local pixel goldens (gitignored) from the CURRENT code
 *   npm run mestre:gerar            (re)write mestre.json from the CURRENT code (only when a change was approved)
 */
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.pw.ts',
  timeout: 300_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  outputDir: './resultados',
  use: { baseURL: 'http://localhost:5191', channel: 'chrome', headless: true, viewport: { width: 1280, height: 760 } },
  webServer: {
    command: 'npm run dev -- --port 5191 --strictPort',
    url: 'http://localhost:5191/tests/navegador/pagina.html',
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: '../..',
  },
})
