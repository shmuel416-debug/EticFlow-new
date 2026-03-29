/**
 * EthicFlow — Pluggable Service Provider Config
 * Loads the active provider name for each service from environment variables.
 * Actual provider implementations live in src/services/<name>/<provider>.provider.js
 *
 * Providers:
 *   AI:       mock | gemini | openai | azure_openai
 *   Email:    console | smtp | microsoft | gmail
 *   Storage:  local | s3 | azure_blob
 *   Calendar: internal | microsoft | google
 */

/**
 * Returns the active AI provider name.
 * @returns {string} Provider name from AI_PROVIDER env (default: 'mock')
 */
export function getAIProvider() {
  return process.env.AI_PROVIDER ?? 'mock'
}

/**
 * Returns the active email provider name.
 * @returns {string} Provider name from EMAIL_PROVIDER env (default: 'console')
 */
export function getEmailProvider() {
  return process.env.EMAIL_PROVIDER ?? 'console'
}

/**
 * Returns the active storage provider name.
 * @returns {string} Provider name from STORAGE_PROVIDER env (default: 'local')
 */
export function getStorageProvider() {
  return process.env.STORAGE_PROVIDER ?? 'local'
}

/**
 * Returns the active calendar provider name.
 * @returns {string} Provider name from CALENDAR_PROVIDER env (default: 'internal')
 */
export function getCalendarProvider() {
  return process.env.CALENDAR_PROVIDER ?? 'internal'
}

/**
 * Logs the active provider for each service. Called on server startup.
 * @returns {void}
 */
export function logActiveProviders() {
  console.log('🔌 Active service providers:')
  console.log(`   AI:       ${getAIProvider()}`)
  console.log(`   Email:    ${getEmailProvider()}`)
  console.log(`   Storage:  ${getStorageProvider()}`)
  console.log(`   Calendar: ${getCalendarProvider()}`)
}
