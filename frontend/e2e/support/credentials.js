/**
 * EthicFlow E2E — role credentials for Playwright suites.
 * Values are loaded from environment with safe local defaults.
 */

/**
 * Role → login credentials map.
 * @type {Record<string, {email:string, password:string}>}
 */
export const USERS = {
  RESEARCHER: {
    email: process.env.E2E_RESEARCHER_EMAIL || '',
    password: process.env.E2E_RESEARCHER_PASSWORD || '',
  },
  SECRETARY: {
    email: process.env.E2E_SECRETARY_EMAIL || '',
    password: process.env.E2E_SECRETARY_PASSWORD || '',
  },
  REVIEWER: {
    email: process.env.E2E_REVIEWER_EMAIL || '',
    password: process.env.E2E_REVIEWER_PASSWORD || '',
  },
  CHAIRMAN: {
    email: process.env.E2E_CHAIRMAN_EMAIL || '',
    password: process.env.E2E_CHAIRMAN_PASSWORD || '',
  },
  ADMIN: {
    email: process.env.E2E_ADMIN_EMAIL || '',
    password: process.env.E2E_ADMIN_PASSWORD || '',
  },
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
