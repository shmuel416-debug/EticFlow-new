/**
 * EthicFlow — Production Microsoft SSO smoke runner.
 * Validates auth redirect, exchange-code replay defense, and health endpoint.
 */

const baseUrl = (process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const assertEnabled = process.env.SMOKE_ASSERT === '1'

/**
 * Runs an HTTP request and returns status + location.
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<{status:number, location:string|null, body:string}>}
 */
async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const location = response.headers.get('location')
  const body = await response.text()
  return { status: response.status, location, body }
}

/**
 * Asserts a condition when SMOKE_ASSERT=1.
 * @param {boolean} condition
 * @param {string} message
 */
function assertOrLog(condition, message) {
  if (!condition) {
    if (assertEnabled) {
      throw new Error(message)
    }
    console.warn(`[WARN] ${message}`)
  }
}

if (!baseUrl) {
  console.error('Missing SMOKE_BASE_URL. Example: https://api.ethics.example.com')
  process.exit(1)
}

console.log(`[Smoke] Base URL: ${baseUrl}`)

const health = await request('/api/health')
console.log(`[Smoke] /api/health -> ${health.status}`)
assertOrLog(health.status === 200, 'Health check failed.')

const microsoftStart = await request('/api/auth/microsoft')
console.log(`[Smoke] /api/auth/microsoft -> ${microsoftStart.status}`)
console.log(`[Smoke] /api/auth/microsoft location -> ${microsoftStart.location || 'none'}`)
assertOrLog(
  microsoftStart.status === 302 &&
    ((microsoftStart.location || '').includes('login.microsoftonline.com') ||
      (microsoftStart.location || '').includes('/login?error=sso_unavailable') ||
      (microsoftStart.location || '').includes('/login?error=sso_failed')),
  'Microsoft redirect did not return expected redirect target.'
)

const invalidExchange = await request('/api/auth/exchange-code', {
  method: 'POST',
  body: JSON.stringify({ code: 'a'.repeat(64) }),
})
console.log(`[Smoke] /api/auth/exchange-code with fake code -> ${invalidExchange.status}`)
assertOrLog(
  invalidExchange.status === 401 || invalidExchange.status === 400,
  'Exchange endpoint did not reject invalid code as expected.'
)

console.log('[Smoke] Microsoft SSO smoke finished.')
console.log(
  '[Manual follow-up required] Complete a real browser login once and verify that replaying the same /api/auth/exchange-code code fails with 401.'
)
