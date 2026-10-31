import { expect, test } from '@playwright/test'

test('privacy policy is publicly accessible', async ({ page }) => {
  await page.goto('/privacy')

  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Retention and controls' })).toBeVisible()
})
