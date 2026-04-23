import { expect, test } from '@playwright/test'

test('multi-role user can switch active role', async ({ page }) => {
  const payload = {
    id: 'e2e-user-1',
    email: 'e2e@example.com',
    roles: ['RESEARCHER', 'SECRETARY'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const fakeToken = `e2e.${base64Payload}.signature`
  await page.addInitScript(([token]) => {
    window.sessionStorage.setItem('ef_session', token)
    window.sessionStorage.setItem('ef_active_role', 'SECRETARY')
    window.localStorage.setItem('ef_active_role_ui', 'SECRETARY')
  }, [fakeToken])

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/dashboard/)
  const roleSwitcher = page.getByLabel(/switch active role|החלף תפקיד פעיל/i)
  await expect(roleSwitcher).toBeVisible()

  await roleSwitcher.selectOption('RESEARCHER')
  await expect(roleSwitcher).toHaveValue('RESEARCHER')
})
