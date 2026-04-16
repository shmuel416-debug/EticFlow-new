/**
 * EthicFlow — Email Service Factory
 * Dispatches to the active provider based on EMAIL_PROVIDER env var.
 * All providers implement: send({ to, subject, html }) → Promise<void>
 *
 * Providers: console (dev) | smtp | microsoft | gmail
 * Swap provider: change EMAIL_PROVIDER in .env and restart.
 */

import { getEmailProvider } from '../../config/services.js'
import { send as consoleSend } from './console.provider.js'
import { send as microsoftSend } from './microsoft.provider.js'

/** @type {Record<string, Function>} */
const providers = {
  console:   consoleSend,
  microsoft: microsoftSend,
  // smtp, gmail — added in Phase 2
}

/**
 * Sends an email via the active provider.
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 * @throws {Error} If EMAIL_PROVIDER is unknown
 */
export async function sendEmail({ to, subject, html }) {
  const providerName = getEmailProvider()
  const send = providers[providerName]

  if (!send) {
    throw new Error(`Unknown EMAIL_PROVIDER: "${providerName}". Valid options: ${Object.keys(providers).join(', ')}`)
  }

  await send({ to, subject, html })
}
