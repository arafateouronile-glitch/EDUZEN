import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/sdk/**',
      '**/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/.next/**',
        '**/sdk/**',
        '**/e2e/**',
        '**/dist/**',
        // Fichiers 0% ou quasi impossible à tester en unitaire (motion, réexport)
        '**/components/ui/motion.tsx',
        '**/lib/errors/index.ts',
        // Génération document (Puppeteer, processeurs lourds) — à couvrir plus tard
        '**/lib/document-generation/**',
        '**/lib/utils/document-generation/**',
        // Adapters tiers / 0% (mobile-money, signature)
        '**/lib/services/mobile-money/**',
        '**/lib/services/esignature-adapters/**',
      ],
      // Seuils après exclusions document-generation + adapters (mars 2026). Objectif : 72% lines, 65% branches.
      thresholds: {
        lines: 32,
        functions: 40,
        branches: 23,
        statements: 31,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
