import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/browser/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'server/utils/rotation/**/*.ts',
        'app/lib/utils.ts',
      ],
      exclude: ['server/utils/rotation/index.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname),
      '@': resolve(__dirname, 'app'),
    },
  },
})
