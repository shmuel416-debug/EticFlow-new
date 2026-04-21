/**
 * EthicFlow E2E — reviewer diff V2 UI behavior.
 */

import { test, expect } from '../support/fixtures'
import { hasAllRoleCredentials } from '../support/credentials'
import { apiCall } from '../support/api-helpers'
import { loginViaUi, gotoAuthed } from '../support/ui-helpers'

test.skip(!hasAllRoleCredentials(), 'All role credentials must be configured for reviewer diff workflow')

/**
 * Builds a submission with at least two versions and reviewer assignment.
 * @param {import('@playwright/test').APIRequestContext} apiContext
 * @param {Record<string,string>} tokens
 * @returns {Promise<{submissionId:string}>}
 */
async function createDiffReadySubmission(apiContext, tokens) {
  const activeForm = await apiCall(apiContext, '/api/forms/active', { token: tokens.RESEARCHER })
  const formId = activeForm.body?.form?.id
  expect(formId).toBeTruthy()

  const title = `PW Diff ${Date.now()}`
  const create = await apiCall(apiContext, '/api/submissions', {
    method: 'POST',
    token: tokens.RESEARCHER,
    body: {
      title,
      formConfigId: formId,
      track: 'FULL',
      dataJson: {
        researchTitle: title,
        researchType: 'survey',
        startDate: '2026-11-01',
        description: 'Initial version for diff verification in UI test.',
      },
    },
  })
  expect(create.status).toBe(201)
  const submissionId = create.body?.submission?.id
  expect(submissionId).toBeTruthy()

  const update = await apiCall(apiContext, `/api/submissions/${submissionId}`, {
    method: 'PUT',
    token: tokens.RESEARCHER,
    body: {
      dataJson: {
        researchTitle: `${title} updated`,
        researchType: 'clinical',
        startDate: '2026-11-15',
        description: 'Updated version for diff verification in UI test with changed fields and values.',
      },
    },
  })
  expect(update.status).toBe(200)

  const submit = await apiCall(apiContext, `/api/submissions/${submissionId}/submit`, {
    method: 'POST',
    token: tokens.RESEARCHER,
  })
  expect(submit.status).toBe(200)

  const triage = await apiCall(apiContext, `/api/submissions/${submissionId}/status`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { status: 'IN_TRIAGE', note: 'diff triage' },
  })
  expect(triage.status).toBe(200)

  const reviewers = await apiCall(apiContext, '/api/users/reviewers', { token: tokens.SECRETARY })
  const reviewerId = reviewers.body?.data?.[0]?.id
  expect(reviewerId).toBeTruthy()

  const assign = await apiCall(apiContext, `/api/submissions/${submissionId}/assign`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { reviewerId },
  })
  expect(assign.status).toBe(200)

  return { submissionId }
}

test('reviewer can use diff filters, search, and noise toggle', async ({ page, apiContext, tokens }) => {
  const { submissionId } = await createDiffReadySubmission(apiContext, tokens)

  await loginViaUi(page, 'REVIEWER')
  await gotoAuthed(page, `/reviewer/assignments/${submissionId}/diff`)

  await expect(page.getByTestId('diff-type-filter')).toBeVisible()
  await expect(page.getByTestId('diff-group-filter')).toBeVisible()
  await expect(page.getByTestId('diff-search')).toBeVisible()
  await expect(page.getByTestId('diff-hide-noise')).toBeChecked()

  await page.getByTestId('diff-type-filter').selectOption('updated')
  await page.getByTestId('diff-search').fill('researchTitle')
  await expect(page.locator('table tbody tr')).toHaveCount(1)

  await page.getByTestId('diff-hide-noise').uncheck()
  await expect(page.locator('table tbody tr')).toHaveCount(1)
})
