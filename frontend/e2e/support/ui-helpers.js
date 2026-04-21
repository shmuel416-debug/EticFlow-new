/**
 * EthicFlow E2E — UI helpers for login/logout and route waits.
 */

import { expect } from '@playwright/test'
import { USERS } from './credentials'

/**
 * Logs in through the UI form and waits for dashboard navigation.
 * @param {import('@playwright/test').Page} page
 * @param {'RESEARCHER'|'SECRETARY'|'REVIEWER'|'CHAIRMAN'|'ADMIN'} role
 * @returns {Promise<void>}
 */
export async function loginViaUi(page, role) {
  const credentials = USERS[role]
  await page.goto('/login')
  await page.locator('[data-testid="login-email"], #login-email').first().fill(credentials.email)
  await page.locator('[data-testid="login-password"], #login-password').first().fill(credentials.password)
  await page.locator('[data-testid="login-submit"], button[type="submit"]').first().click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

/**
 * Opens protected route after login and verifies current path.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @returns {Promise<void>}
 */
export async function gotoAuthed(page, path) {
  await page.goto(path)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
}
