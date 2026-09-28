import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.skip('user can register', async ({ page }) => {
  await page.goto('/auth?mode=register')

  await page.getByLabel('Email').fill('user123@gmail.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByText('Check your email to confirm your account.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Email confirmation required' })).toBeVisible()
})

test('user cannot login with invalid password', async ({ page }) => {
  await page.goto('/auth?mode=login')

  await page.getByLabel('Email').fill(email!)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
})

test.describe('authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth?mode=login')

    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('Binance Spot Wallet Balance')).toBeVisible()
  })

  test('authenticated user cannot access auth page', async ({ page }) => {
    await page.goto('/auth?mode=login')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can logout', async ({ page }) => {
    await page.getByRole('button', { name: 'Open profile menu' }).click()
    await page.getByRole('menuitem', { name: 'Log out' }).click()
    await expect(page).toHaveURL('/auth')
  })
})

test('unauthenticated user cannot access dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/auth')
})
