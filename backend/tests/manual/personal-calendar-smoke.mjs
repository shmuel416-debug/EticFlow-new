/**
 * EthicFlow — Personal calendar smoke runner.
 * Validates protected status endpoint and OAuth connect redirects.
 */

const baseUrl = (process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const bearerToken = process.env.SMOKE_BEARER_TOKEN || ''
const assertEnabled = process.env.SMOKE_ASSERT === '1'
const requireProviderConfigured = process.env.SMOKE_REQUIRE_CONFIGURED === '1'

/**
 * Executes HTTP request against target API.
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<{status:number, location:string|null, body:string}>}
 */
async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...init,
    headers: {
      ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
      ...(init.headers || {}),
    },
  })
  const location = response.headers.get('location')
  const body = await response.text()
  return { status: response.status, location, body }
}

/**
 * Throws when assert mode is active and check fails.
 * @param {boolean} condition
 * @param {string} message
 */
function assertOrLog(condition, message) {
  if (!condition) {
    if (assertEnabled) throw new Error(message)
    console.warn(`[WARN] ${message}`)
  }
}

if (!baseUrl) {
  console.error('Missing SMOKE_BASE_URL. Example: https://api.ethics.example.com')
  process.exit(1)
}
if (!bearerToken) {
  console.error('Missing SMOKE_BEARER_TOKEN from a real user session.')
  process.exit(1)
}

console.log(`[Smoke] Base URL: ${baseUrl}`)

const status = await request('/api/calendar/status')
console.log(`[Smoke] /api/calendar/status -> ${status.status}`)
assertOrLog(status.status === 200, 'Calendar status endpoint must return 200.')

const googleRedirect = await request('/api/calendar/connect/google')
console.log(`[Smoke] /api/calendar/connect/google -> ${googleRedirect.status}`)
if (googleRedirect.status === 500 && !requireProviderConfigured) {
  console.warn('[WARN] Google provider not configured in target environment.')
} else {
  assertOrLog(
    googleRedirect.status === 302 && (googleRedirect.location || '').includes('accounts.google.com'),
    'Google connect endpoint did not redirect to accounts.google.com.'
  )
}

const microsoftRedirect = await request('/api/calendar/connect/microsoft')
console.log(`[Smoke] /api/calendar/connect/microsoft -> ${microsoftRedirect.status}`)
if (microsoftRedirect.status === 500 && !requireProviderConfigured) {
  console.warn('[WARN] Microsoft provider not configured in target environment.')
} else {
  assertOrLog(
    microsoftRedirect.status === 302 && (microsoftRedirect.location || '').includes('login.microsoftonline.com'),
    'Microsoft connect endpoint did not redirect to login.microsoftonline.com.'
  )
}

console.log('[Smoke] Personal calendar redirect checks finished.')
console.log(
  '[Manual follow-up required] Complete OAuth in browser and verify /settings shows connected status, meeting sync appears in external calendar, then disconnect succeeds.'
)
