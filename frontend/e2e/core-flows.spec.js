import { expect, request, test } from '@playwright/test'

const USERS = {
  RESEARCHER: { email: process.env.E2E_RESEARCHER_EMAIL || 'researcher@test.com', password: process.env.E2E_RESEARCHER_PASSWORD || '123456' },
  SECRETARY: { email: process.env.E2E_SECRETARY_EMAIL || 'secretary@test.com', password: process.env.E2E_SECRETARY_PASSWORD || '123456' },
  REVIEWER: { email: process.env.E2E_REVIEWER_EMAIL || 'reviewer@test.com', password: process.env.E2E_REVIEWER_PASSWORD || '123456' },
  CHAIRMAN: { email: process.env.E2E_CHAIRMAN_EMAIL || 'chairman@test.com', password: process.env.E2E_CHAIRMAN_PASSWORD || '123456' },
  ADMIN: { email: process.env.E2E_ADMIN_EMAIL || 'admin@test.com', password: process.env.E2E_ADMIN_PASSWORD || '123456' },
}

/**
 * Performs API call using shared request context.
 * @param {import('@playwright/test').APIRequestContext} ctx
 * @param {string} path
 * @param {{method?:string, token?:string, body?:any}} [opts]
 * @returns {Promise<{status:number, body:any, headers:Record<string,string>}>
 */
async function apiCall(ctx, path, opts = {}) {
  const headers = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const response = await ctx.fetch(path, {
    method: opts.method || 'GET',
    headers,
    data: opts.body,
  })
  const contentType = response.headers()['content-type'] || ''
  let body = null
  if (contentType.includes('application/json')) {
    body = await response.json()
  }
  return { status: response.status(), body, headers: response.headers() }
}

/**
 * Logs all role tokens for current suite.
 * @param {import('@playwright/test').APIRequestContext} ctx
 * @returns {Promise<Record<string, string>>}
 */
async function loginAll(ctx) {
  const out = {}
  for (const [role, creds] of Object.entries(USERS)) {
    const login = await apiCall(ctx, '/api/auth/login', { method: 'POST', body: creds })
    expect(login.status, `${role} login should succeed`).toBe(200)
    expect(login.body?.token).toBeTruthy()
    out[role] = login.body.token
  }
  return out
}

test.describe.serial('Sprint 9 core E2E scenarios', () => {
  let ctx
  let tokens
  const state = {
    submissionId: '',
    reviewerId: '',
  }

  test.beforeAll(async ({ baseURL }) => {
    ctx = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
    tokens = await loginAll(ctx)
  })

  test.afterAll(async () => {
    await ctx.dispose()
  })

  test('1) Submit -> Assign -> Review -> Decision', async () => {
    const activeForm = await apiCall(ctx, '/api/forms/active', { token: tokens.RESEARCHER })
    expect(activeForm.status).toBe(200)
    expect(activeForm.body?.form?.id).toBeTruthy()

    const create = await apiCall(ctx, '/api/submissions', {
      method: 'POST',
      token: tokens.RESEARCHER,
      body: {
        title: `PW Core Flow ${Date.now()}`,
        formConfigId: activeForm.body.form.id,
        track: 'FULL',
        dataJson: {
          researchName: 'Playwright Core Flow',
          note: 'Automated Sprint 9 test',
          protocolTitle: 'PW Submission',
        },
      },
    })
    expect(create.status).toBe(201)
    state.submissionId = create.body?.submission?.id
    expect(state.submissionId).toBeTruthy()

    const submit = await apiCall(ctx, `/api/submissions/${state.submissionId}/submit`, {
      method: 'POST',
      token: tokens.RESEARCHER,
    })
    expect(submit.status).toBe(200)

    const toTriage = await apiCall(ctx, `/api/submissions/${state.submissionId}/status`, {
      method: 'PATCH',
      token: tokens.SECRETARY,
      body: { status: 'IN_TRIAGE', note: 'playwright-triage' },
    })
    expect(toTriage.status).toBe(200)

    const reviewers = await apiCall(ctx, '/api/users/reviewers', { token: tokens.SECRETARY })
    expect(reviewers.status).toBe(200)
    state.reviewerId = reviewers.body?.data?.[0]?.id
    expect(state.reviewerId).toBeTruthy()

    const assign = await apiCall(ctx, `/api/submissions/${state.submissionId}/assign`, {
      method: 'PATCH',
      token: tokens.SECRETARY,
      body: { reviewerId: state.reviewerId },
    })
    expect(assign.status).toBe(200)

    const review = await apiCall(ctx, `/api/submissions/${state.submissionId}/review`, {
      method: 'PATCH',
      token: tokens.REVIEWER,
      body: {
        score: 4,
        recommendation: 'APPROVED',
        comments: 'Playwright core scenario review comment with enough length.',
      },
    })
    expect(review.status).toBe(200)

    const decision = await apiCall(ctx, `/api/submissions/${state.submissionId}/decision`, {
      method: 'PATCH',
      token: tokens.CHAIRMAN,
      body: { decision: 'APPROVED', note: 'Playwright chairman decision' },
    })
    expect(decision.status).toBe(200)
  })

  test('2) Approval Letter HE/EN download', async () => {
    expect(state.submissionId).toBeTruthy()

    const pdfHe = await ctx.fetch(`/api/submissions/${state.submissionId}/approval-letter?lang=he`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.CHAIRMAN}` },
    })
    expect(pdfHe.status()).toBe(200)
    expect(pdfHe.headers()['content-type']).toContain('application/pdf')

    const pdfEn = await ctx.fetch(`/api/submissions/${state.submissionId}/approval-letter?lang=en`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.CHAIRMAN}` },
    })
    expect(pdfEn.status()).toBe(200)
    expect(pdfEn.headers()['content-type']).toContain('application/pdf')
  })

  test('3) Admin impersonation + reports export', async () => {
    const users = await apiCall(ctx, '/api/users/admin/users?page=1&limit=30', { token: tokens.ADMIN })
    expect(users.status).toBe(200)
    const researcher = users.body?.data?.find((u) => u.role === 'RESEARCHER')
    expect(researcher?.id).toBeTruthy()

    const impersonate = await apiCall(ctx, `/api/users/admin/impersonate/${researcher.id}`, {
      method: 'POST',
      token: tokens.ADMIN,
    })
    expect(impersonate.status).toBe(200)
    expect(impersonate.body?.token).toBeTruthy()

    const me = await apiCall(ctx, '/api/auth/me', { token: impersonate.body.token })
    expect(me.status).toBe(200)
    expect(me.body?.user?.role).toBe('RESEARCHER')

    const exportRes = await ctx.fetch('/api/reports/export/submissions?lang=he', {
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    })
    expect(exportRes.status()).toBe(200)
    expect(exportRes.headers()['content-type']).toContain('spreadsheetml')
  })

  test('4) RBAC negative checks', async () => {
    const researcherReports = await apiCall(ctx, '/api/reports/stats', { token: tokens.RESEARCHER })
    expect(researcherReports.status).toBe(403)

    const reviewerSecretaryDashboard = await apiCall(ctx, '/api/submissions/dashboard/secretary', { token: tokens.REVIEWER })
    expect(reviewerSecretaryDashboard.status).toBe(403)

    const chairmanUsers = await apiCall(ctx, '/api/users/admin/users', { token: tokens.CHAIRMAN })
    expect(chairmanUsers.status).toBe(403)
  })
})
