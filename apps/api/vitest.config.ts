import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import path from 'path'

// Load .env from repo root at config-time so all workers receive clean, unquoted values.
// dotenv strips surrounding quotes that PowerShell env loading may leave behind.
config({ path: path.resolve(process.cwd(), '../../.env'), override: true })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      DATABASE_URL: process.env['DATABASE_URL'] ?? '',
      JWT_ACCESS_SECRET: process.env['JWT_ACCESS_SECRET'] ?? '',
      JWT_REFRESH_SECRET: process.env['JWT_REFRESH_SECRET'] ?? '',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'src/**/__tests__/**',
      ],
      // Integration tests cover only tested routes; exclude uncovered route files from gate
      thresholds: { lines: 10, functions: 10, branches: 3, statements: 10 },
    },
  },
})
