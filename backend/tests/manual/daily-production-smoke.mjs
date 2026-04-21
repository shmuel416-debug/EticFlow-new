/**
 * EthicFlow — Daily Production Smoke
 * Minimal daily operational smoke for production stability tracking.
 */

const BASE = process.env.TEST_BASE_URL || 'https://frontend-eticflow-dev.up.railway.app'
const USERS = [
  { role: 'RESEARCHER', email: 'researcher@test.com', password: '123456' },
  { role: 'SECRETARY', email: 'secretary@test.com', password: '123456' },
  { role: 'REVIEWER', email: 'reviewer@test.com', password: '123456' },
  { role: 'CHAIRMAN', email: 'chairman@test.com', password: '123456' },
  { role: 'ADMIN', email: 'admin@test.com', password: '123456' },
]

/**
 * Performs HTTP request and parses JSON when available.
 * @param {string} path
 * @param {{method?:string, token?:string, body?:any}} [opts]
 * @returns {Promise<{status:number, body:any, headers:Headers}>}
 */
async function call(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  const body = ct.includes('application/json') ? await res.json().catch(() => null) : null
  return { status: res.status, body, headers: res.headers }
}

/**
 * Runs daily smoke and prints JSON result.
 * @returns {Promise<void>}
 */
async function main() {
  const out = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    health: null,
    roles: {},
    rbac: {},
    exports: {},
    approvalPdf: {},
    status: 'PASS',
  }

  const health = await call('/api/health')
  out.health = {
    statusCode: health.status,
    database: health.body?.database ?? 'unknown',
  }

  if (health.status !== 200 || health.body?.database !== 'connected') {
    out.status = 'FAIL'
  }

  const tokens = {}
  for (const u of USERS) {
    const login = await call('/api/auth/login', {
      method: 'POST',
      body: { email: u.email, password: u.password },
    })
    const ok = login.status === 200 && Boolean(login.body?.token)
    out.roles[u.role] = ok ? 'PASS' : `FAIL (${login.status})`
    if (!ok) out.status = 'FAIL'
    if (ok) tokens[u.role] = login.body.token
  }

  if (tokens.RESEARCHER) {
    const r = await call('/api/reports/stats', { token: tokens.RESEARCHER })
    out.rbac.researcherReportsBlocked = r.status === 403 ? 'PASS' : `FAIL (${r.status})`
  }
  if (tokens.REVIEWER) {
    const r = await call('/api/submissions/dashboard/secretary', { token: tokens.REVIEWER })
    out.rbac.reviewerSecretaryBlocked = r.status === 403 ? 'PASS' : `FAIL (${r.status})`
  }
  if (tokens.CHAIRMAN) {
    const r = await call('/api/users/admin/users', { token: tokens.CHAIRMAN })
    out.rbac.chairmanAdminBlocked = r.status === 403 ? 'PASS' : `FAIL (${r.status})`
  }

  for (const [k, v] of Object.entries(out.rbac)) {
    if (!String(v).startsWith('PASS')) out.status = 'FAIL'
  }

  if (tokens.ADMIN) {
    const ex = await fetch(`${BASE}/api/reports/export/submissions?lang=he`, {
      headers: { Authorization: `Bearer ${tokens.ADMIN}` },
    })
    out.exports.adminXlsx =
      ex.status === 200 && (ex.headers.get('content-type') || '').includes('spreadsheetml')
        ? 'PASS'
        : `FAIL (${ex.status})`

    if (!String(out.exports.adminXlsx).startsWith('PASS')) out.status = 'FAIL'
  }

  if (tokens.CHAIRMAN) {
    const list = await call('/api/submissions?statuses=APPROVED&limit=1', { token: tokens.CHAIRMAN })
    const approvedId = list.body?.data?.[0]?.id
    if (approvedId) {
      const he = await fetch(`${BASE}/api/submissions/${approvedId}/approval-letter?lang=he`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.CHAIRMAN}` },
      })
      const en = await fetch(`${BASE}/api/submissions/${approvedId}/approval-letter?lang=en`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.CHAIRMAN}` },
      })
      out.approvalPdf.he = he.status === 200 ? 'PASS' : `FAIL (${he.status})`
      out.approvalPdf.en = en.status === 200 ? 'PASS' : `FAIL (${en.status})`
      if (!String(out.approvalPdf.he).startsWith('PASS')) out.status = 'FAIL'
      if (!String(out.approvalPdf.en).startsWith('PASS')) out.status = 'FAIL'
    } else {
      out.approvalPdf.he = 'SKIP (no approved submission)'
      out.approvalPdf.en = 'SKIP (no approved submission)'
    }
  }

  console.log(JSON.stringify(out, null, 2))
  if (out.status === 'FAIL') process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
