/**
 * EthicFlow — Microsoft Email Provider
 * Sends emails via Microsoft Graph API using Client Credentials (app-level auth).
 * Requires an Azure AD App Registration with Mail.Send permission.
 *
 * Env vars required:
 *   MICROSOFT_MAIL_TENANT_ID     — Azure AD tenant ID
 *   MICROSOFT_MAIL_CLIENT_ID     — App registration client ID
 *   MICROSOFT_MAIL_CLIENT_SECRET — App registration client secret
 *   SMTP_FROM                    — Sender email address (must be a licensed mailbox)
 *   SMTP_FROM_NAME               — Sender display name (optional)
 */

import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'

/** Cached Graph client (re-used across calls) */
let _graphClient = null

/**
 * Returns an authenticated Microsoft Graph client.
 * Uses Client Credentials flow — no user interaction required.
 * @returns {Client}
 * @throws {Error} If required env vars are missing
 */
function getGraphClient() {
  if (_graphClient) return _graphClient

  const tenantId  = process.env.MICROSOFT_MAIL_TENANT_ID
  const clientId  = process.env.MICROSOFT_MAIL_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_MAIL_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Microsoft Email provider requires MICROSOFT_MAIL_TENANT_ID, ' +
      'MICROSOFT_MAIL_CLIENT_ID, and MICROSOFT_MAIL_CLIENT_SECRET'
    )
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  _graphClient = Client.initWithMiddleware({ authProvider })
  return _graphClient
}

/**
 * Builds the Microsoft Graph sendMail request body.
 * @param {{ to: string, subject: string, html: string, fromEmail: string, fromName: string }} params
 * @returns {object} Graph API message payload
 */
function buildMailPayload({ to, subject, html, fromEmail, fromName }) {
  return {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      toRecipients: [
        {
          emailAddress: { address: to },
        },
      ],
      from: {
        emailAddress: {
          address: fromEmail,
          name: fromName || fromEmail,
        },
      },
    },
    saveToSentItems: false,
  }
}

/**
 * Sends an email via Microsoft Graph API.
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 * @throws {Error} If Graph API call fails or env vars are missing
 */
export async function send({ to, subject, html }) {
  const fromEmail = process.env.SMTP_FROM
  const fromName  = process.env.SMTP_FROM_NAME || fromEmail

  if (!fromEmail) {
    throw new Error('Microsoft Email provider requires SMTP_FROM (the sender mailbox address)')
  }

  const client = getGraphClient()
  const payload = buildMailPayload({ to, subject, html, fromEmail, fromName })

  // Send on behalf of the fromEmail mailbox
  await client
    .api(`/users/${fromEmail}/sendMail`)
    .post(payload)
}
