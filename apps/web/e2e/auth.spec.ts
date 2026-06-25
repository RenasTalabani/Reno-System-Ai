import { test, expect } from '@playwright/test'

const DEMO = {
  workspace: 'demo',
  email: 'admin@demo.com',
  password: 'Demo@123456',
}

// ─── Login Page ───────────────────────────────────────────────────────────────

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('redirects to dashboard on valid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill(DEMO.email)
    await page.getByLabel(/password/i).fill(DEMO.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  test('shows error for wrong password', async ({ page }) => {
    await page.getByLabel(/email/i).fill(DEMO.email)
    await page.getByLabel(/password/i).fill('WrongPassword@999')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should show error message (not redirect)
    await expect(page).not.toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('shows error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('not-an-email')
    await page.getByLabel(/password/i).fill('SomePass@123')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 })
  })

  test('redirects to /login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})

// ─── Authentication State ─────────────────────────────────────────────────────

test.describe('Authentication Flow', () => {
  test('successful login flow end-to-end', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(DEMO.email)
    await page.getByLabel(/password/i).fill(DEMO.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Dashboard should show the user's name or email
    await expect(page.locator('body')).toContainText(/welcome/i, { timeout: 5000 })
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(DEMO.email)
    await page.getByLabel(/password/i).fill(DEMO.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Find and click logout button (hover on user section first)
    await page.locator('aside').hover()
    const logoutBtn = page.locator('[title="Sign out"]')
    await logoutBtn.waitFor({ state: 'visible', timeout: 5000 })
    await logoutBtn.click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})
