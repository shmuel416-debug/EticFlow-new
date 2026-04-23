/**
 * EthicFlow — Observability Service
 * Centralized hooks for correlation logging, error capture, and alerts.
 */

/**
 * Initializes observability mode.
 * @returns {void}
 */
export function initializeObservability() {
  const sentryConfigured = Boolean(process.env.SENTRY_DSN)
  console.log(`[Observability] request correlation enabled; sentry=${sentryConfigured ? 'on' : 'off'}`)
}

/**
 * Captures an exception with optional context.
 * @param {unknown} err
 * @param {{ requestId?: string, route?: string, method?: string, statusCode?: number }} [context]
 * @returns {void}
 */
export function captureException(err, context = {}) {
  const message = err instanceof Error ? err.message : String(err)
  console.error('[Observability][Exception]', { message, ...context })
}

/**
 * Emits an operational alert event.
 * @param {string} eventName
 * @param {object} payload
 * @returns {void}
 */
export function emitAlert(eventName, payload = {}) {
  console.error('[Observability][Alert]', eventName, payload)
}
