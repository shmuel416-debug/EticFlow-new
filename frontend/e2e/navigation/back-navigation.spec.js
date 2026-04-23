/**
 * EthicFlow E2E — back navigation regression coverage.
 * Verifies "back to list" links return to the source queue/list.
 */

import { test, expect } from '../support/fixtures'
import { hasWorkflowRoleCredentials } from '../support/credentials'
import { apiCall } from '../support/api-helpers'
import { gotoAuthed, loginViaUi } from '../support/ui-helpers'

test.skip(
  !hasWorkflowRoleCredentials(),
  'RESEARCHER, SECRETARY, REVIEWER, and CHAIRMAN credentials are required for back-navigation workflow tests'
)

/**
 * Creates a submitted submission for list/detail navigation checks.
 * @param {import('@playwright/test').APIRequestContext} apiContext
 * @param {Record<string,string>} tokens
 * @param {string} suffix
 * @returns {Promise<{submissionId:string,title:string,reviewerId:string}>}
 */
async function createSubmittedSubmission(apiContext, tokens, suffix) {
  const activeForm = await apiCall(apiContext, '/api/forms/active', { token: tokens.RESEARCHER })
  expect(activeForm.status).toBe(200)
  const formId = activeForm.body?.form?.id
  expect(formId).toBeTruthy()

  const title = `PW BackNav ${suffix} ${Date.now()}`
  const create = await apiCall(apiContext, '/api/submissions', {
    method: 'POST',
    token: tokens.RESEARCHER,
    body: {
      title,
      formConfigId: formId,
      track: 'FULL',
      dataJson: {
        researchTitle: title,
        researchType: 'clinical',
        startDate: '2026-12-01',
        description: 'Back navigation regression test setup payload.',
      },
    },
  })
  expect(create.status).toBe(201)
  const submissionId = create.body?.submission?.id
  expect(submissionId).toBeTruthy()

  const submit = await apiCall(apiContext, `/api/submissions/${submissionId}/submit`, {
    method: 'POST',
    token: tokens.RESEARCHER,
  })
  expect(submit.status).toBe(200)

  const triage = await apiCall(apiContext, `/api/submissions/${submissionId}/status`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { status: 'IN_TRIAGE', note: 'back-nav-triage' },
  })
  expect(triage.status).toBe(200)

  const reviewers = await apiCall(apiContext, '/api/users/reviewers', { token: tokens.SECRETARY })
  expect(reviewers.status).toBe(200)
  const reviewerId = reviewers.body?.data?.[0]?.id
  expect(reviewerId).toBeTruthy()

  const assign = await apiCall(apiContext, `/api/submissions/${submissionId}/assign`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { reviewerId },
  })
  expect(assign.status).toBe(200)

  return { submissionId, title, reviewerId }
}

/**
 * Moves a submission to IN_REVIEW so chairman queue can open it.
 * @param {import('@playwright/test').APIRequestContext} apiContext
 * @param {Record<string,string>} tokens
 * @param {string} submissionId
 * @returns {Promise<void>}
 */
async function moveToInReview(apiContext, tokens, submissionId) {
  const transition = await apiCall(apiContext, `/api/submissions/${submissionId}/status`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { status: 'IN_REVIEW', note: 'back-nav-in-review' },
  })
  expect(transition.status).toBe(200)
}

test('secretary detail back link returns to submissions management list', async ({ page, apiContext, tokens }) => {
  const { submissionId, title } = await createSubmittedSubmission(apiContext, tokens, 'SECRETARY')

  await loginViaUi(page, 'SECRETARY')
  await gotoAuthed(page, '/secretary/submissions')
  await page.getByTestId('secretary-submissions-search').fill(title)
  await page.getByTestId(`secretary-open-submission-${submissionId}`).click()
  await expect(page).toHaveURL(new RegExp(`/secretary/submissions/${submissionId}$`))

  await page.locator('a[href="/secretary/submissions"]').first().click()
  await expect(page).toHaveURL(/\/secretary\/submissions$/)
})

test('chairman decision back link returns to chairman queue', async ({ page, apiContext, tokens }) => {
  const { submissionId } = await createSubmittedSubmission(apiContext, tokens, 'CHAIRMAN')
  await moveToInReview(apiContext, tokens, submissionId)

  await loginViaUi(page, 'CHAIRMAN')
  await gotoAuthed(page, '/chairman/queue')
  await page.getByTestId(`chairman-open-submission-${submissionId}`).click()
  await expect(page).toHaveURL(new RegExp(`/chairman/queue/${submissionId}$`))

  await page.locator('a[href="/chairman/queue"]').first().click()
  await expect(page).toHaveURL(/\/chairman\/queue$/)
})

test('reviewer detail and diff back links keep reviewer navigation context', async ({ page, apiContext, tokens }) => {
  const { submissionId } = await createSubmittedSubmission(apiContext, tokens, 'REVIEWER')

  await loginViaUi(page, 'REVIEWER')
  await gotoAuthed(page, '/reviewer/assignments')
  await page.getByTestId(`reviewer-open-assignment-${submissionId}`).click()
  await expect(page).toHaveURL(new RegExp(`/reviewer/assignments/${submissionId}$`))

  await page.getByTestId('open-review-diff').click()
  await expect(page).toHaveURL(new RegExp(`/reviewer/assignments/${submissionId}/diff$`))

  await page.locator(`a[href="/reviewer/assignments/${submissionId}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`/reviewer/assignments/${submissionId}$`))

  await page.locator('a[href="/reviewer/assignments"]').first().click()
  await expect(page).toHaveURL(/\/reviewer\/assignments$/)
})
