import { defineConfig } from 'vitest/config'
// Several tests build the full 2400 x 1680 terrain and plan Terrasen on it (seconds each). With all files running in parallel
// the default 5 s per test is too tight (the 0d.2 gate failed on a timeout, not on a value). 30 s still fails a real hang.
export default defineConfig({ test: { include: ['src/**/*.test.ts'], testTimeout: 30_000 } })
