/**
 * EthicFlow E2E — smoke checks for language switch and direction.
 */

import { test, expect } from '../support/fixtures'
import { hasRoleCredentials } from '../support/credentials'
import { loginViaUi, gotoAuthed } from '../support/ui-helpers'

test('login page switches direction between English and Hebrew', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByRole('button', { name: 'עברית' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
})

test('calendar and diff pages respect rtl/ltr direction', async ({ browser, baseURL }) => {
  test.skip(
    !hasRoleCredentials('SECRETARY') || !hasRoleCredentials('REVIEWER'),
    'SECRETARY and REVIEWER credentials are required'
  )
  const secretaryPage = await browser.newPage({ baseURL })
  await loginViaUi(secretaryPage, 'SECRETARY')
  await secretaryPage.getByRole('button', { name: 'English' }).click()
  await gotoAuthed(secretaryPage, '/meetings/calendar')
  await expect(secretaryPage.locator('html')).toHaveAttribute('dir', 'ltr')
  await secretaryPage.getByRole('button', { name: 'עברית' }).click()
  await expect(secretaryPage.locator('html')).toHaveAttribute('dir', 'rtl')
  await secretaryPage.close()

  const reviewerPage = await browser.newPage({ baseURL })
  await loginViaUi(reviewerPage, 'REVIEWER')
  await reviewerPage.getByRole('button', { name: 'English' }).click()
  await gotoAuthed(reviewerPage, '/reviewer/assignments')
  await expect(reviewerPage.locator('html')).toHaveAttribute('dir', 'ltr')
  await reviewerPage.close()
})
