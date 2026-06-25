import { test, expect } from '@playwright/test'

// ─── Shared login helper ───────────────────────────────────────────────────────

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@demo.com')
  await page.getByLabel(/password/i).fill('Demo@123456')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('renders welcome heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 5000 })
  })

  test('shows sidebar navigation', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible()
  })

  test('sidebar contains main navigation links', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /users/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /hr/i })).toBeVisible()
  })

  test('shows stat cards', async ({ page }) => {
    await expect(page.getByText(/total users/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/active roles/i)).toBeVisible()
  })

  test('shows Reno System branding in sidebar', async ({ page }) => {
    await expect(page.locator('aside').getByText(/reno system/i)).toBeVisible()
  })

  test('topbar renders with title', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible()
    await expect(page.locator('header').getByText(/dashboard/i)).toBeVisible()
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('navigates to Users page', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: /^users$/i }).click()
    await expect(page).toHaveURL('/users')
    await expect(page.locator('header').getByText(/users/i)).toBeVisible()
  })

  test('navigates to HR page', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: /^hr$/i }).click()
    await expect(page).toHaveURL('/hr')
  })

  test('navigates to Settings page', async ({ page }) => {
    await page.locator('aside').getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL('/settings')
  })

  test('active link is highlighted in sidebar', async ({ page }) => {
    const dashboardLink = page.locator('aside').getByRole('link', { name: /dashboard/i })
    // The active link should have different styling (bg-sidebar-primary class)
    await expect(dashboardLink).toHaveClass(/bg-sidebar-primary/)
  })
})

// ─── Responsive ───────────────────────────────────────────────────────────────

test.describe('Responsive Layout', () => {
  test('sidebar is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAsAdmin(page)
    await expect(page.locator('aside')).toBeVisible()
  })
})
