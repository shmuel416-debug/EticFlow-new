/**
 * EthicFlow — startup dependency checks.
 * Runs optional dependency probes without making unrelated API routes unavailable.
 */

import { assertPuppeteerAvailable } from './services/pdf/renderer.js'

/**
 * Verifies whether the PDF renderer is available for runtime PDF generation.
 * @param {() => Promise<void>} assertRendererAvailable - Renderer probe function.
 * @param {{ log: Function, warn: Function }} logger - Logger used for startup messages.
 * @returns {Promise<boolean>} True when PDF rendering is available.
 */
export async function checkPdfRendererStartup(
  assertRendererAvailable = assertPuppeteerAvailable,
  logger = console
) {
  try {
    await assertRendererAvailable()
    logger.log('PDF renderer ready')
    return true
  } catch (err) {
    logger.warn(
      'PDF renderer unavailable; continuing API startup without PDF generation.',
      err?.message ?? err
    )
    return false
  }
}
