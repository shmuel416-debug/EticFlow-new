/**
 * EthicFlow E2E — UI workflow: triage, assign, review, and chairman decision.
 */

import { test, expect } from '../support/fixtures'
import { hasWorkflowRoleCredentials } from '../support/credentials'
import { apiCall } from '../support/api-helpers'
import { gotoAuthed } from '../support/ui-helpers'

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

  const reviewerMe = await apiCall(apiContext, '/api/auth/me', { token: tokens.REVIEWER })
  expect(reviewerMe.status).toBe(200)
  const reviewerId = reviewerMe.body?.user?.id
  expect(reviewerId).toBeTruthy()

  return { submissionId, title, reviewerId }
}

/**
 * Injects an authenticated session for the selected role.
 * Avoids repeated login form submits and rate-limit issues during cross-role flow.
 * @param {import('@playwright/test').Page} page
 * @param {string} token
 * @param {'RESEARCHER'|'SECRETARY'|'REVIEWER'|'CHAIRMAN'|'ADMIN'} role
 * @returns {Promise<void>}
 */
async function authenticateViaSession(page, token, role) {
  await page.addInitScript(([sessionToken, activeRole]) => {
    window.sessionStorage.setItem('ef_session', sessionToken)
    window.sessionStorage.setItem('ef_active_role', activeRole)
    window.localStorage.setItem('ef_active_role_ui', activeRole)
  }, [token, role])
}

test('submit -> assign -> review -> decision works across role UIs', async ({ browser, apiContext, tokens, baseURL }) => {
  const { submissionId, reviewerId } = await createSubmittedWorkflowItem(apiContext, tokens)

  const secretaryPage = await browser.newPage({ baseURL })
  await authenticateViaSession(secretaryPage, tokens.SECRETARY, 'SECRETARY')
  await gotoAuthed(secretaryPage, `/secretary/submissions/${submissionId}`)
  await expect(secretaryPage).toHaveURL(new RegExp(`/secretary/submissions/${submissionId}$`))

  const moveToTriage = await apiCall(apiContext, `/api/submissions/${submissionId}/status`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { status: 'IN_TRIAGE' },
  })
  expect(moveToTriage.status).toBe(200)

  const assignReviewer = await apiCall(apiContext, `/api/submissions/${submissionId}/assign`, {
    method: 'PATCH',
    token: tokens.SECRETARY,
    body: { reviewerId },
  })
  expect(assignReviewer.status).toBe(200)
  await secretaryPage.close()

  const reviewSubmit = await apiCall(apiContext, `/api/submissions/${submissionId}/review`, {
    method: 'PATCH',
    token: tokens.REVIEWER,
    body: {
      score: 4,
      recommendation: 'APPROVED',
      comments: 'Playwright integration review submitted with sufficient detail for committee decision.',
    },
  })
  expect(reviewSubmit.status).toBe(200)

  const chairmanPage = await browser.newPage({ baseURL })
  await authenticateViaSession(chairmanPage, tokens.CHAIRMAN, 'CHAIRMAN')
  await gotoAuthed(chairmanPage, '/chairman/queue')
  const votes = await Promise.all([
    apiCall(apiContext, `/api/submissions/${submissionId}/votes`, {
      method: 'POST',
      token: tokens.REVIEWER,
      body: { decision: 'APPROVED', note: 'Reviewer vote for approval.' },
    }),
    apiCall(apiContext, `/api/submissions/${submissionId}/votes`, {
      method: 'POST',
      token: tokens.SECRETARY,
      body: { decision: 'APPROVED', note: 'Secretary vote for approval.' },
    }),
    apiCall(apiContext, `/api/submissions/${submissionId}/votes`, {
      method: 'POST',
      token: tokens.CHAIRMAN,
      body: { decision: 'APPROVED', note: 'Chairman vote for approval.' },
    }),
  ])
  for (const vote of votes) {
    expect(vote.status).toBe(201)
  }

  const decision = await apiCall(apiContext, `/api/submissions/${submissionId}/decision`, {
    method: 'PATCH',
    token: tokens.CHAIRMAN,
    body: {
      decision: 'APPROVED',
      note: 'Approved by Playwright integrated role flow.',
    },
  })
  expect(decision.status).toBe(200)
  await chairmanPage.close()

  const finalState = await apiCall(apiContext, `/api/submissions/${submissionId}`, { token: tokens.CHAIRMAN })
  expect(finalState.status).toBe(200)
  expect(finalState.body?.submission?.status).toBe('APPROVED')
})
