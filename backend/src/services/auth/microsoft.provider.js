/**
 * EthicFlow — Microsoft Auth Provider (Entra ID / Azure AD SSO)
 * Implements OAuth2 / OIDC flow using @azure/msal-node.
 *
 * Flow:
 *   1. getAuthUrl(state)          → redirect user to Microsoft login
 *   2. exchangeCode(code, state)  → exchange auth code for tokens → get user profile
 *   3. Returns { externalId, email, fullName, tenantId }
 *
 * Env vars required:
 *   MICROSOFT_AUTH_CLIENT_ID      — App registration client ID
 *   MICROSOFT_AUTH_CLIENT_SECRET  — App registration client secret
 *   MICROSOFT_AUTH_TENANT_ID      — Tenant ID (or 'common' for multi-tenant)
 *   MICROSOFT_AUTH_REDIRECT_URI   — Callback URL (e.g. http://localhost:5000/api/auth/microsoft/callback)
 */

import { ConfidentialClientApplication } from '@azure/msal-node'
import { Client } from '@microsoft/microsoft-graph-client'

/** Scopes requested from Microsoft */
const SCOPES = ['openid', 'profile', 'email', 'User.Read']

/** @type {ConfidentialClientApplication|null} */
let _msalClient = null

/**
 * Returns the configured MSAL client (cached).
 * @returns {ConfidentialClientApplication}
 * @throws {Error} If required env vars are missing
 */
function getMsalClient() {
  if (_msalClient) return _msalClient

  const clientId = process.env.MICROSOFT_AUTH_CLIENT_ID
    || process.env.MICROSOFT_CLIENT_ID
    || process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_AUTH_CLIENT_SECRET
    || process.env.MICROSOFT_CLIENT_SECRET
    || process.env.AZURE_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_AUTH_TENANT_ID
    || process.env.MICROSOFT_TENANT_ID
    || process.env.AZURE_TENANT_ID
    || 'common'

  if (!clientId || !clientSecret) {
    throw new Error(
      'Microsoft SSO requires MICROSOFT_AUTH_CLIENT_ID/MICROSOFT_CLIENT_ID and MICROSOFT_AUTH_CLIENT_SECRET/MICROSOFT_CLIENT_SECRET'
    )
  }

  _msalClient = new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  })

  return _msalClient
}

/**
 * Returns the OAuth2 redirect URI from env.
 * @returns {string}
 * @throws {Error} If env var is missing
 */
function getRedirectUri() {
  const uri = process.env.MICROSOFT_AUTH_REDIRECT_URI
    || process.env.MICROSOFT_REDIRECT_URI
    || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/auth/microsoft/callback` : '')
  if (!uri) {
    throw new Error('Microsoft SSO requires MICROSOFT_AUTH_REDIRECT_URI/MICROSOFT_REDIRECT_URI or FRONTEND_URL')
  }
  return uri
}

/**
 * Generates the Microsoft login URL to redirect the user to.
 * @param {string} state - Random CSRF-prevention token
 * @returns {Promise<string>} Microsoft authorization URL
 */
export async function getAuthUrl(state) {
  const client = getMsalClient()

  const authUrl = await client.getAuthCodeUrl({
    scopes:      SCOPES,
    redirectUri: getRedirectUri(),
    state,
    prompt:      'select_account',
  })

  if (!authUrl || typeof authUrl !== 'string') {
    throw new Error('Microsoft SSO failed to generate authorization URL')
  }

  return authUrl
}

/**
 * Exchanges an authorization code for user profile information.
 * @param {string} code  - Auth code from Microsoft callback query param
 * @param {string} state - State param (already validated by caller)
 * @returns {Promise<{ externalId: string, email: string, fullName: string, tenantId: string }>}
 * @throws {Error} If code exchange or profile fetch fails
 */
export async function exchangeCode(code, state) {
  const client = getMsalClient()

  // Exchange code for token
  const tokenResponse = await client.acquireTokenByCode({
    code,
    scopes:      SCOPES,
    redirectUri: getRedirectUri(),
  })

  const { account, accessToken } = tokenResponse

  // Optionally restrict to specific tenant
  const allowedTenant = process.env.MICROSOFT_AUTH_TENANT_ID
  if (allowedTenant && allowedTenant !== 'common' && account.tenantId !== allowedTenant) {
    throw new Error(`SSO_TENANT_MISMATCH: User tenant ${account.tenantId} is not allowed`)
  }

  // Fetch full profile via Graph API with the access token
  const profile = await fetchUserProfile(accessToken)

  return {
    externalId: account.homeAccountId || profile.id,
    email:      profile.mail || profile.userPrincipalName,
    fullName:   profile.displayName,
    tenantId:   account.tenantId,
  }
}

/**
 * Fetches the authenticated user's profile from Microsoft Graph.
 * @param {string} accessToken - Bearer access token
 * @returns {Promise<{ id: string, displayName: string, mail: string, userPrincipalName: string }>}
 */
async function fetchUserProfile(accessToken) {
  // Build a simple Graph client using the access token directly
  const authProvider = (done) => done(null, accessToken)
  const graphClient  = Client.init({ authProvider })

  return graphClient
    .api('/me')
    .select('id,displayName,mail,userPrincipalName')
    .get()
}
