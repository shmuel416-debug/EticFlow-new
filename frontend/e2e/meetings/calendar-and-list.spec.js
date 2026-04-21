/**
 * EthicFlow E2E — meetings list and calendar V2 UI checks.
 */

import { test, expect } from '../support/fixtures'
import { hasRoleCredentials } from '../support/credentials'
import { loginViaUi, gotoAuthed } from '../support/ui-helpers'

/**
 * Converts date to local datetime-local input value.
 * @param {Date} date
 * @returns {string}
 */
function toLocalInputDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Converts date to YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

test('secretary can create meeting and see it in calendar day drill-down', async ({ page }) => {
  test.skip(!hasRoleCredentials('SECRETARY'), 'SECRETARY credentials are not configured')
  await loginViaUi(page, 'SECRETARY')
  await gotoAuthed(page, '/meetings')

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 7)
  targetDate.setHours(12, 0, 0, 0)
  const targetKey = toDateKey(targetDate)
  const title = `PW Meeting ${Date.now()}`

  await page.getByTestId('meetings-open-create-modal').click()
  await page.getByTestId('meeting-create-title').fill(title)
  await page.getByTestId('meeting-create-datetime').fill(toLocalInputDateTime(targetDate))
  await page.getByTestId('meeting-create-location').fill('Room UI-E2E')
  await page.getByTestId('meeting-create-submit').click()

  await expect(page.getByText(title)).toBeVisible()

  await page.getByTestId('meetings-open-calendar').click()
  await expect(page).toHaveURL(/\/meetings\/calendar$/)
  await page.getByTestId('calendar-status-filter').selectOption('SCHEDULED')
  await page.getByTestId(`calendar-day-${targetKey}`).click()
  await expect(page.getByText(title)).toBeVisible()
})
