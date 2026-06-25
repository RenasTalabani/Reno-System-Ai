// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * Sets required JWT environment variables for tests.
 * Call this in beforeAll() for any test suite that uses auth.
 */
export function setupJwtEnv(): void {
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-minimum-32-characters-long'
  process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-minimum-32-characters-long'
  process.env['JWT_ACCESS_EXPIRES_IN'] = '15m'
  process.env['JWT_REFRESH_EXPIRES_IN'] = '7d'
}

/**
 * Sets required database URL for integration tests.
 * Falls back to a test-specific database if TEST_DATABASE_URL is set.
 */
export function setupDbEnv(): void {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'] ?? ''
  }
}

/**
 * Waits for a condition to be true (polling).
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options
  const start = Date.now()
  while (!(await condition())) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out')
    await new Promise((r) => setTimeout(r, interval))
  }
}

/**
 * Asserts that a promise rejects with a specific error type and message pattern.
 */
export async function expectRejection(
  promise: Promise<unknown>,
  ErrorClass: new (...args: never[]) => Error,
  messagePattern?: string | RegExp,
): Promise<void> {
  try {
    await promise
    throw new Error('Expected promise to reject but it resolved')
  } catch (err) {
    if (!(err instanceof ErrorClass)) {
      throw new Error(`Expected ${ErrorClass.name} but got ${(err as Error).constructor.name}`)
    }
    if (messagePattern) {
      const msg = (err as Error).message
      if (typeof messagePattern === 'string') {
        if (!msg.includes(messagePattern)) {
          throw new Error(`Expected error message to include "${messagePattern}", got: "${msg}"`)
        }
      } else {
        if (!messagePattern.test(msg)) {
          throw new Error(`Expected error message to match ${messagePattern}, got: "${msg}"`)
        }
      }
    }
  }
}

/**
 * Strips undefined values from objects for clean comparison.
 */
export function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

/**
 * Generates a random string of given length.
 */
export function randomString(length = 16): string {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, '0')
}
