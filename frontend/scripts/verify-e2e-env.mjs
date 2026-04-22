/**
 * EthicFlow E2E CI env verification.
 * Fails CI early when required role credentials are missing.
 */

/**
 * List of mandatory E2E credential variables for role-based UI flows.
 * @type {string[]}
 */
const REQUIRED_ENV_VARS = [
  'E2E_RESEARCHER_EMAIL',
  'E2E_RESEARCHER_PASSWORD',
  'E2E_SECRETARY_EMAIL',
  'E2E_SECRETARY_PASSWORD',
  'E2E_REVIEWER_EMAIL',
  'E2E_REVIEWER_PASSWORD',
  'E2E_CHAIRMAN_EMAIL',
  'E2E_CHAIRMAN_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
]

/**
 * Returns missing env vars from a required list.
 * @param {string[]} names
 * @returns {string[]}
 */
function getMissingEnvVars(names) {
  return names.filter((name) => {
    const value = process.env[name]
    return !value || value.trim().length === 0
  })
}

const missingEnvVars = getMissingEnvVars(REQUIRED_ENV_VARS)

if (missingEnvVars.length > 0) {
  console.error('E2E CI preflight failed: missing required environment variables:')
  for (const name of missingEnvVars) {
    console.error(`- ${name}`)
  }
  process.exit(1)
}

console.log('E2E CI preflight passed: all role credentials are configured.')
