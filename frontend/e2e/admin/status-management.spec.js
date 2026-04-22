/**
 * EthicFlow E2E — admin status management smoke test.
 */

import { test, expect } from '../support/fixtures'
import { hasRoleCredentials } from '../support/credentials'
import { gotoAuthed, loginViaUi } from '../support/ui-helpers'

test.skip(!hasRoleCredentials('ADMIN'), 'ADMIN credentials are required for status management test')

test('admin can create and delete a custom status', async ({ page, baseURL }) => {
  const code = `PW_STATUS_${Date.now()}`

  await loginViaUi(page, 'ADMIN')
  await gotoAuthed(page, '/admin/statuses')
  await expect(page).toHaveURL(new RegExp(`${baseURL?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || ''}/admin/statuses`))

  await page.getByTestId('status-mgmt-add-code').fill(code)
  await page.getByTestId('status-mgmt-add-label-he').fill('סטטוס אוטומציה')
  await page.getByTestId('status-mgmt-add-label-en').fill('Automation Status')
  await page.getByTestId('status-mgmt-add-submit').click()

  await expect(page.getByTestId(`status-row-${code}`)).toBeVisible()
  await page.getByTestId(`status-delete-${code}`).click()

  await expect(page.getByTestId(`status-row-${code}`)).toHaveCount(0)
})
