/**
 * EthicFlow E2E — role credentials for Playwright suites.
 * Values are loaded from environment with safe local defaults.
 */

/**
 * Role → login credentials map.
 * @type {Record<string, {email:string, password:string}>}
 */
const DEFAULT_PASSWORD = process.env.E2E_DEFAULT_PASSWORD || '123456'
const allowSeedFallback = process.env.E2E_DISABLE_SEED_FALLBACK !== 'true'

/**
 * Resolves env-based credential with optional seed fallback.
 * @param {string|undefined} emailFromEnv
 * @param {string} seedEmail
 * @param {string|undefined} passwordFromEnv
 * @returns {{ email: string, password: string }}
 */
function resolveCredentials(emailFromEnv, seedEmail, passwordFromEnv) {
  const email = emailFromEnv || (allowSeedFallback ? seedEmail : '')
  const password = passwordFromEnv || (allowSeedFallback ? DEFAULT_PASSWORD : '')
  return { email, password }
}

export const USERS = {
  RESEARCHER: resolveCredentials(
    process.env.E2E_RESEARCHER_EMAIL,
    'researcher@test.com',
    process.env.E2E_RESEARCHER_PASSWORD
  ),
  SECRETARY: resolveCredentials(
    process.env.E2E_SECRETARY_EMAIL,
    'secretary@test.com',
    process.env.E2E_SECRETARY_PASSWORD
  ),
  REVIEWER: resolveCredentials(
    process.env.E2E_REVIEWER_EMAIL,
    'reviewer@test.com',
    process.env.E2E_REVIEWER_PASSWORD
  ),
  CHAIRMAN: resolveCredentials(
    process.env.E2E_CHAIRMAN_EMAIL,
    'chairman@test.com',
    process.env.E2E_CHAIRMAN_PASSWORD
  ),
  ADMIN: resolveCredentials(
    process.env.E2E_ADMIN_EMAIL,
    'admin@test.com',
    process.env.E2E_ADMIN_PASSWORD
  ),
}

/** Canonical role order used by test suites. */
export const ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']

/**
 * Roles required for cross-role submission → review E2E (API setup + multi-role UI).
 * ADMIN is not used in these flows.
 */
export const WORKFLOW_ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN']

/**
 * Returns true when credentials for role are configured.
 * @param {string} role
 * @returns {boolean}
 */
export function hasRoleCredentials(role) {
  const creds = USERS[role]
  return Boolean(creds?.email && creds?.password)
}

/**
 * Returns true when all roles have credentials configured.
 * @returns {boolean}
 */
export function hasAllRoleCredentials() {
  return ROLES.every((role) => hasRoleCredentials(role))
}

/**
 * @returns {boolean} True when workflow E2E can run (all roles used by those tests).
 */
export function hasWorkflowRoleCredentials() {
  return WORKFLOW_ROLES.every((role) => hasRoleCredentials(role))
}
