/**
 * EthicFlow E2E — RBAC negative route checks via UI navigation.
 */

import { test, expect } from '../support/fixtures'
import { hasRoleCredentials } from '../support/credentials'
import { loginViaUi } from '../support/ui-helpers'

/**
 * Asserts protected route redirects unauthorized role to dashboard.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @returns {Promise<void>}
 */
async function expectRouteBlocked(page, path) {
  await page.goto(path)
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('researcher is blocked from meetings and reports routes', async ({ page }) => {
  test.skip(!hasRoleCredentials('RESEARCHER'), 'RESEARCHER credentials are not configured')
  await loginViaUi(page, 'RESEARCHER')
  await expectRouteBlocked(page, '/meetings')
  await expectRouteBlocked(page, '/reports')
})

test('reviewer is blocked from secretary and admin routes', async ({ page }) => {
  test.skip(!hasRoleCredentials('REVIEWER'), 'REVIEWER credentials are not configured')
  await loginViaUi(page, 'REVIEWER')
  await expectRouteBlocked(page, '/secretary/submissions')
  await expectRouteBlocked(page, '/users')
})

test('chairman is blocked from admin users route', async ({ page }) => {
  test.skip(!hasRoleCredentials('CHAIRMAN'), 'CHAIRMAN credentials are not configured')
  await loginViaUi(page, 'CHAIRMAN')
  await expectRouteBlocked(page, '/users')
})
