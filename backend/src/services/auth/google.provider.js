/**
 * EthicFlow — Google Auth Provider (Google OAuth2 SSO)
 * Implements OAuth2 Authorization Code flow using the googleapis library.
 *
 * Flow:
 *   1. getAuthUrl(state)          → redirect user to Google login page
 *   2. exchangeCode(code)         → exchange auth code for tokens → fetch user profile
 *   3. Returns { externalId, email, fullName }
 *
 * Env vars required:
 *   GOOGLE_AUTH_CLIENT_ID      — OAuth2 client ID from Google Cloud Console
 *   GOOGLE_AUTH_CLIENT_SECRET  — OAuth2 client secret
 *   GOOGLE_AUTH_REDIRECT_URI   — Callback URL (must match Google Console setting)
 *                                 e.g. http://localhost:5000/api/auth/google/callback
 *   GOOGLE_AUTH_ALLOWED_DOMAIN — (Optional) Restrict to a Google Workspace domain
 *                                 e.g. institution.ac.il
 */

import { google } from 'googleapis'

/** OAuth2 scopes requested from Google */
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

/**
 * Returns a configured OAuth2 client.
 * @returns {import('googleapis').Auth.OAuth2Client}
 * @throws {Error} If required env vars are missing
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_AUTH_CLIENT_ID
    || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET
    || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI
    || process.env.GOOGLE_REDIRECT_URI
    || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/auth/google/callback` : '')

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google SSO requires GOOGLE_AUTH_CLIENT_ID/GOOGLE_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET/GOOGLE_CLIENT_SECRET, and GOOGLE_AUTH_REDIRECT_URI/GOOGLE_REDIRECT_URI or FRONTEND_URL'
    )
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generates the Google OAuth2 authorization URL to redirect the user to.
 * Includes a CSRF-prevention state parameter.
 * @param {string} state - Random CSRF-prevention token
 * @returns {string} Google authorization URL
 */
export function getAuthUrl(state) {
  const client = getOAuth2Client()

  return client.generateAuthUrl({
    access_type: 'offline',
    scope:        SCOPES,
    state,
    prompt:       'select_account',
    include_granted_scopes: true,
  })
}

/**
 * Exchanges an authorization code for user profile information.
 * @param {string} code - Auth code from Google callback query param
 * @returns {Promise<{ externalId: string, email: string, fullName: string }>}
 * @throws {Error} If code exchange or profile fetch fails
 */
export async function exchangeCode(code) {
  const client = getOAuth2Client()

  // Exchange authorization code for tokens
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  // Fetch user profile from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data: profile } = await oauth2.userinfo.get()

  if (!profile.email) {
    throw new Error('Google SSO: no email returned in user profile')
  }

  // Optionally restrict to a specific Google Workspace domain
  const allowedDomain = process.env.GOOGLE_AUTH_ALLOWED_DOMAIN
  if (allowedDomain) {
    const emailDomain = profile.email.split('@')[1]
    if (emailDomain !== allowedDomain) {
      throw new Error(`SSO_DOMAIN_MISMATCH: email domain ${emailDomain} is not allowed`)
    }
  }

  return {
    externalId: profile.id,
    email:      profile.email,
    fullName:   profile.name || profile.given_name || profile.email,
  }
}
