/**
 * EthicFlow E2E — UI authentication flows.
 */

import { test, expect } from '../support/fixtures'
import { ROLES, hasRoleCredentials } from '../support/credentials'
import { loginViaUi } from '../support/ui-helpers'

for (const role of ROLES) {
  test(`login succeeds for ${role} via UI`, async ({ page }) => {
    test.skip(!hasRoleCredentials(role), `${role} credentials are not configured`)
    await loginViaUi(page, role)
    const sessionToken = await page.evaluate(() => sessionStorage.getItem('ef_session'))
    expect(sessionToken).toBeTruthy()
  })
}

test('login shows error on invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.locator('[data-testid="login-email"], #login-email').first().fill('invalid@ethicflow.test')
  await page.locator('[data-testid="login-password"], #login-password').first().fill('wrong-password')
  await page.locator('[data-testid="login-submit"], button[type="submit"]').first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('[data-testid="login-error"], [role="alert"]').first()).toBeVisible()
})
