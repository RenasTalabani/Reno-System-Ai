import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'core',
      root: './packages/core',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'auth',
      root: './packages/auth',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'api-unit',
      root: './apps/api',
      include: ['src/**/__tests__/unit/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'api-integration',
      root: './apps/api',
      include: ['src/**/__tests__/integration/**/*.test.ts'],
      environment: 'node',
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  },
])
