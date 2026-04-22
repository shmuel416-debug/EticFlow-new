/**
 * EthicFlow E2E — UI workflow: triage, assign, review, and chairman decision.
 */

import { test, expect } from '../support/fixtures'
import { hasWorkflowRoleCredentials } from '../support/credentials'
import { apiCall } from '../support/api-helpers'
import { loginViaUi, gotoAuthed } from '../support/ui-helpers'

test.skip(
  !hasWorkflowRoleCredentials(),
  'RESEARCHER, SECRETARY, REVIEWER, and CHAIRMAN credentials are required for cross-role workflow'
)

/**
 * Creates a submitted submission via API for deterministic UI workflow testing.
 * @param {import('@playwright/test').APIRequestContext} apiContext
 * @param {Record<string,string>} tokens
 * @returns {Promise<{submissionId:string, title:string, reviewerId:string}>}
 */
async function createSubmittedWorkflowItem(apiContext, tokens) {
  const activeForm = await apiCall(apiContext, '/api/forms/active', { token: tokens.RESEARCHER })
  expect(activeForm.status).toBe(200)
  const formId = activeForm.body?.form?.id
  expect(formId).toBeTruthy()

  const title = `PW UI Workflow ${Date.now()}`
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
        description: 'UI workflow data for secretary-reviewer-chairman automated validation.',
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

  const reviewers = await apiCall(apiContext, '/api/users/reviewers', { token: tokens.SECRETARY })
  expect(reviewers.status).toBe(200)
  const reviewerId = reviewers.body?.data?.[0]?.id
  expect(reviewerId).toBeTruthy()

  return { submissionId, title, reviewerId }
}

test('submit -> assign -> review -> decision works across role UIs', async ({ browser, apiContext, tokens, baseURL }) => {
  const { submissionId, title, reviewerId } = await createSubmittedWorkflowItem(apiContext, tokens)

  const secretaryPage = await browser.newPage({ baseURL })
  await loginViaUi(secretaryPage, 'SECRETARY')
  await gotoAuthed(secretaryPage, '/secretary/submissions')
  await secretaryPage.getByTestId('secretary-submissions-search').fill(title)
  await secretaryPage.getByTestId(`secretary-open-submission-${submissionId}`).click()
  await expect(secretaryPage).toHaveURL(new RegExp(`/secretary/submissions/${submissionId}$`))

  await secretaryPage.getByTestId('status-transition-IN_TRIAGE').click()
  await secretaryPage.getByTestId('reviewer-select').selectOption(reviewerId)
  await secretaryPage.getByTestId('assign-reviewer-submit').click()

  const transitionToReview = secretaryPage.getByTestId('status-transition-IN_REVIEW')
  if (await transitionToReview.count()) {
    await transitionToReview.click()
  }
  await secretaryPage.close()

  const reviewerPage = await browser.newPage({ baseURL })
  await loginViaUi(reviewerPage, 'REVIEWER')
  await gotoAuthed(reviewerPage, '/reviewer/assignments')
  await reviewerPage.getByTestId(`reviewer-open-assignment-${submissionId}`).click()
  await reviewerPage.getByTestId('review-recommendation-APPROVED').check()
  await reviewerPage.getByTestId('review-comments').fill('Playwright UI review with enough details for validation and business traceability.')
  await reviewerPage.getByTestId('review-submit').click()
  await expect(reviewerPage).toHaveURL(/\/reviewer\/assignments$/)
  await reviewerPage.close()

  const chairmanPage = await browser.newPage({ baseURL })
  await loginViaUi(chairmanPage, 'CHAIRMAN')
  await gotoAuthed(chairmanPage, '/chairman/queue')
  await chairmanPage.getByTestId(`chairman-open-submission-${submissionId}`).click()
  await chairmanPage.getByTestId('chairman-decision-note').fill('Approved by Playwright UI flow.')
  chairmanPage.once('dialog', (dialog) => dialog.accept())
  await chairmanPage.getByTestId('chairman-decision-APPROVED').click()
  await expect(chairmanPage).toHaveURL(/\/chairman\/queue$/)
  await chairmanPage.close()

  const finalState = await apiCall(apiContext, `/api/submissions/${submissionId}`, { token: tokens.CHAIRMAN })
  expect(finalState.status).toBe(200)
  expect(finalState.body?.submission?.status).toBe('APPROVED')
})
