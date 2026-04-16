/**
 * EthicFlow — Gmail Email Provider
 * Sends emails via the Gmail API using OAuth2 (refresh token flow).
 * Emails are sent from the authorized Gmail account (typically the institution's
 * organizational Gmail address, e.g. ethics@institution.ac.il).
 *
 * Setup requires a Google Cloud project with Gmail API enabled and an OAuth2
 * client with offline access. Generate a refresh token once (see DEPLOYMENT.md).
 *
 * Env vars required:
 *   GMAIL_CLIENT_ID      — OAuth2 client ID from Google Cloud Console
 *   GMAIL_CLIENT_SECRET  — OAuth2 client secret
 *   GMAIL_REFRESH_TOKEN  — Offline refresh token for the sender account
 *   SMTP_FROM            — Sender email address (must match the authorized Gmail account)
 *   SMTP_FROM_NAME       — Sender display name (optional)
 */

import { google } from 'googleapis'

/** @type {import('googleapis').gmail_v1.Gmail|null} */
let _gmailClient = null

/**
 * Returns an authenticated Gmail client (cached).
 * Uses OAuth2 refresh token to obtain access tokens automatically.
 * @returns {Promise<import('googleapis').gmail_v1.Gmail>}
 * @throws {Error} If required env vars are missing
 */
async function getGmailClient() {
  if (_gmailClient) return _gmailClient

  const clientId     = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail provider requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN'
    )
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  _gmailClient = google.gmail({ version: 'v1', auth: oauth2Client })
  return _gmailClient
}

/**
 * Encodes an email address with optional display name for RFC 2822.
 * @param {string} email
 * @param {string} [name]
 * @returns {string}
 */
function encodeAddress(email, name) {
  if (!name) return email
  // Encode name as UTF-8 base64 for proper Hebrew/international support
  const encoded = Buffer.from(name, 'utf8').toString('base64')
  return `=?UTF-8?B?${encoded}?= <${email}>`
}

/**
 * Builds a base64url-encoded RFC 2822 email message.
 * @param {{ to: string, fromEmail: string, fromName: string, subject: string, html: string }} params
 * @returns {string} base64url-encoded email
 */
function buildRawMessage({ to, fromEmail, fromName, subject, html }) {
  const from = encodeAddress(fromEmail, fromName)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html, 'utf8').toString('base64'),
  ].join('\r\n')

  // base64url encode (Gmail requires base64url, not standard base64)
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Sends an email via the Gmail API.
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 * @throws {Error} If Gmail API call fails or env vars are missing
 */
export async function send({ to, subject, html }) {
  const fromEmail = process.env.SMTP_FROM
  const fromName  = process.env.SMTP_FROM_NAME || fromEmail

  if (!fromEmail) {
    throw new Error('Gmail provider requires SMTP_FROM (the sender Gmail address)')
  }

  const gmail = await getGmailClient()
  const raw   = buildRawMessage({ to, fromEmail, fromName, subject, html })

  await gmail.users.messages.send({
    userId:      'me',
    requestBody: { raw },
  })
}
