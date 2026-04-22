/**
 * EthicFlow — User Microsoft Calendar Provider
 * OAuth + per-user event operations for personal Outlook calendars.
 */

const AUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Calendars.ReadWrite',
]

/**
 * Returns Microsoft OAuth client configuration.
 * @returns {{ tenantId: string, clientId: string, clientSecret: string, redirectUri: string }}
 */
function getConfig() {
  const tenantId = process.env.MICROSOFT_CALENDAR_USER_TENANT_ID
    || process.env.MICROSOFT_AUTH_TENANT_ID
    || 'common'
  const clientId = process.env.MICROSOFT_CALENDAR_USER_CLIENT_ID
    || process.env.MICROSOFT_AUTH_CLIENT_ID
    || process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CALENDAR_USER_CLIENT_SECRET
    || process.env.MICROSOFT_AUTH_CLIENT_SECRET
    || process.env.MICROSOFT_CLIENT_SECRET
  const redirectUri = process.env.MICROSOFT_CALENDAR_USER_REDIRECT_URI
    || process.env.MICROSOFT_AUTH_REDIRECT_URI
    || 'http://localhost:5000/api/calendar/callback/microsoft'

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft user calendar requires MICROSOFT_CALENDAR_USER_CLIENT_ID and MICROSOFT_CALENDAR_USER_CLIENT_SECRET (or MICROSOFT_AUTH_* fallbacks)')
  }

  return { tenantId, clientId, clientSecret, redirectUri }
}

/**
 * Builds URL encoded form body.
 * @param {Record<string,string>} values
 * @returns {string}
 */
function toFormBody(values) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => params.append(key, value))
  return params.toString()
}

/**
 * Exchanges OAuth token grant against Microsoft identity platform.
 * @param {Record<string,string>} payload
 * @returns {Promise<any>}
 */
async function fetchToken(payload) {
  const cfg = getConfig()
  const endpoint = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toFormBody({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      ...payload,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || 'Microsoft token exchange failed')
  }
  return data
}

/**
 * Fetches current user profile using Graph API.
 * @param {string} accessToken
 * @returns {Promise<{ email: string }>}
 */
async function fetchProfile(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Microsoft profile fetch failed')
  }
  return {
    email: data.mail || data.userPrincipalName || '',
  }
}

/**
 * Generates Microsoft OAuth URL for personal calendar connection.
 * @param {string} state
 * @returns {string}
 */
export function getAuthUrl(state) {
  const cfg = getConfig()
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    redirect_uri: cfg.redirectUri,
    response_mode: 'query',
    scope: AUTH_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  })
  return `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/authorize?${params.toString()}`
}

/**
 * Exchanges OAuth code for user tokens and profile.
 * @param {string} code
 * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiryDate: Date|null, email: string }>}
 */
export async function exchangeCode(code) {
  const cfg = getConfig()
  const token = await fetchToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    scope: AUTH_SCOPES.join(' '),
  })
  const profile = await fetchProfile(token.access_token)

  return {
    accessToken: token.access_token || '',
    refreshToken: token.refresh_token || null,
    expiryDate: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null,
    email: profile.email,
  }
}

/**
 * Refreshes Microsoft access token using refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiryDate: Date|null }>}
 */
export async function refreshAccessToken(refreshToken) {
  const token = await fetchToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: AUTH_SCOPES.join(' '),
  })
  return {
    accessToken: token.access_token || '',
    refreshToken: token.refresh_token || refreshToken,
    expiryDate: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null,
  }
}

/**
 * Executes a Microsoft Graph request with bearer token.
 * @param {string} accessToken
 * @param {string} path
 * @param {'POST'|'PATCH'|'DELETE'} method
 * @param {object|undefined} body
 * @returns {Promise<any>}
 */
async function graphRequest(accessToken, path, method, body) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Microsoft Graph request failed')
  }
  return data
}

/**
 * Converts event payload to Microsoft Graph event body.
 * @param {{ title: string, description?: string, startTime: Date|string, endTime: Date|string, location?: string }} eventData
 * @returns {object}
 */
function buildEventBody(eventData) {
  return {
    subject: eventData.title,
    body: {
      contentType: 'HTML',
      content: eventData.description || '',
    },
    start: {
      dateTime: new Date(eventData.startTime).toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    end: {
      dateTime: new Date(eventData.endTime).toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    location: eventData.location ? { displayName: eventData.location } : undefined,
  }
}

/**
 * Creates a user event in Outlook calendar.
 * @param {{ accessToken: string }} connection
 * @param {{ title: string, description?: string, startTime: Date|string, endTime: Date|string, location?: string }} eventData
 * @returns {Promise<string>}
 */
export async function createEvent(connection, eventData) {
  const data = await graphRequest(connection.accessToken, '/me/events', 'POST', buildEventBody(eventData))
  return String(data?.id || '')
}

/**
 * Updates a user event in Outlook calendar.
 * @param {{ accessToken: string }} connection
 * @param {string} externalEventId
 * @param {{ title: string, description?: string, startTime: Date|string, endTime: Date|string, location?: string }} eventData
 * @returns {Promise<void>}
 */
export async function updateEvent(connection, externalEventId, eventData) {
  await graphRequest(connection.accessToken, `/me/events/${externalEventId}`, 'PATCH', buildEventBody(eventData))
}

/**
 * Deletes a user event in Outlook calendar.
 * @param {{ accessToken: string }} connection
 * @param {string} externalEventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(connection, externalEventId) {
  await graphRequest(connection.accessToken, `/me/events/${externalEventId}`, 'DELETE')
}
