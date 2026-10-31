import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated dashboard tests')

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth?mode=login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('table', { name: 'Portfolio assets' })).toBeVisible()
  })

  test('filters assets by search', async ({ page }) => {
    await expect(page.getByText('Bitcoin')).toBeVisible()
    await expect(page.getByText('Ethereum')).toBeVisible()
    await expect(page.getByText('Solana')).toBeVisible()

    await page.getByPlaceholder('Search in Your Assets').fill('bitcoin')

    await expect(page.getByText('Bitcoin')).toBeVisible()
    await expect(page.getByText('Ethereum')).not.toBeVisible()
    await expect(page.getByText('Solana')).not.toBeVisible()
  })

  test('shows empty state when no assets match search', async ({ page }) => {
    await page.getByPlaceholder('Search in Your Assets').fill('nullcoin')

    const rows = page.getByRole('table', { name: 'Portfolio assets' }).locator('tbody tr')

    await expect(rows).toHaveCount(1)
    await expect(page.getByText('Nothing found')).toBeVisible()
  })

  test('sorts assets by total', async ({ page }) => {
    const rows = page.getByRole('table', { name: 'Portfolio assets' }).locator('tbody tr')

    await expect(rows.nth(0)).toContainText('Bitcoin')
    await expect(rows.nth(1)).toContainText('Ethereum')
    await expect(rows.nth(2)).toContainText('Solana')

    await page.getByRole('button', { name: 'Total' }).click()

    await expect(rows.nth(0)).toContainText('Solana')
    await expect(rows.nth(1)).toContainText('Ethereum')
    await expect(rows.nth(2)).toContainText('Bitcoin')
  })

  test('filters assets by performance', async ({ page }) => {
    const rows = page.getByRole('table', { name: 'Portfolio assets' }).locator('tbody tr')

    await page.getByRole('button', { name: 'Gainers' }).click()
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toContainText('Bitcoin')
    await expect(rows.nth(1)).toContainText('Solana')

    await page.getByRole('button', { name: 'Losers' }).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.nth(0)).toContainText('Ethereum')

    await page.getByRole('button', { name: 'All' }).click()
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Bitcoin')
    await expect(rows.nth(1)).toContainText('Ethereum')
    await expect(rows.nth(2)).toContainText('Solana')
  })
  test('currency filter', async ({ page }) => {
    await page.getByRole('button', { name: 'Open settings menu' }).click()

    const currencyButton = page.getByRole('button', { name: 'Currency' })
    await expect(currencyButton).toContainText('USD')
    await currencyButton.click()
    await expect(currencyButton).toHaveAttribute('aria-expanded', 'true')

    await expect(page.getByText('GBP', { exact: true })).toBeVisible()
    await expect(page.getByText('EUR', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'EUR' }).click()
    await expect(currencyButton).toContainText('EUR')
    await expect(currencyButton).toHaveAttribute('aria-expanded', 'false')
  })
})
