/**
 * EthicFlow — User Google Calendar Provider
 * OAuth + per-user event operations for personal Google calendars.
 */

import { google } from 'googleapis'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
]

/**
 * Returns a configured Google OAuth2 client.
 * @returns {import('googleapis').Auth.OAuth2Client}
 */
function getOAuthClient() {
  const clientId = process.env.GOOGLE_CALENDAR_USER_CLIENT_ID
    || process.env.GOOGLE_AUTH_CLIENT_ID
    || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_USER_CLIENT_SECRET
    || process.env.GOOGLE_AUTH_CLIENT_SECRET
    || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_USER_REDIRECT_URI
    || process.env.GOOGLE_AUTH_REDIRECT_URI
    || 'http://localhost:5000/api/calendar/callback/google'

  if (!clientId || !clientSecret) {
    throw new Error('Google user calendar requires GOOGLE_CALENDAR_USER_CLIENT_ID and GOOGLE_CALENDAR_USER_CLIENT_SECRET (or GOOGLE_AUTH_* fallbacks)')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Returns a calendar v3 client with user credentials.
 * @param {{ accessToken: string, refreshToken?: string, expiryDate?: number|null }} connection
 * @returns {import('googleapis').calendar_v3.Calendar}
 */
function getCalendarClient(connection) {
  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken || undefined,
    expiry_date: connection.expiryDate || undefined,
  })
  return google.calendar({ version: 'v3', auth })
}

/**
 * Generates Google OAuth URL for personal calendar connection.
 * @param {string} state
 * @returns {string}
 */
export function getAuthUrl(state) {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  })
}

/**
 * Exchanges OAuth code for user tokens and profile.
 * @param {string} code
 * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiryDate: Date|null, email: string }>}
 */
export async function exchangeCode(code) {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()

  return {
    accessToken: tokens.access_token ?? '',
    refreshToken: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: data.email || '',
  }
}

/**
 * Refreshes Google access token using stored refresh token.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string|null, expiryDate: Date|null }>}
 */
export async function refreshAccessToken(refreshToken) {
  const client = getOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    accessToken: credentials.access_token ?? '',
    refreshToken: credentials.refresh_token ?? refreshToken,
    expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
  }
}

/**
 * Creates a user event in Google Calendar.
 * @param {{ accessToken: string, refreshToken?: string, expiryDate?: number|null }} connection
 * @param {{ title: string, description?: string, startTime: Date|string, endTime: Date|string, location?: string }} eventData
 * @returns {Promise<string>}
 */
export async function createEvent(connection, eventData) {
  const calendar = getCalendarClient(connection)
  const res = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: eventData.title,
      description: eventData.description || '',
      start: { dateTime: new Date(eventData.startTime).toISOString(), timeZone: 'Asia/Jerusalem' },
      end: { dateTime: new Date(eventData.endTime).toISOString(), timeZone: 'Asia/Jerusalem' },
      location: eventData.location || undefined,
    },
  })
  return String(res.data.id || '')
}

/**
 * Updates a user event in Google Calendar.
 * @param {{ accessToken: string, refreshToken?: string, expiryDate?: number|null }} connection
 * @param {string} externalEventId
 * @param {{ title: string, description?: string, startTime: Date|string, endTime: Date|string, location?: string }} eventData
 * @returns {Promise<void>}
 */
export async function updateEvent(connection, externalEventId, eventData) {
  const calendar = getCalendarClient(connection)
  await calendar.events.patch({
    calendarId: 'primary',
    eventId: externalEventId,
    sendUpdates: 'all',
    requestBody: {
      summary: eventData.title,
      description: eventData.description || '',
      start: { dateTime: new Date(eventData.startTime).toISOString(), timeZone: 'Asia/Jerusalem' },
      end: { dateTime: new Date(eventData.endTime).toISOString(), timeZone: 'Asia/Jerusalem' },
      location: eventData.location || undefined,
    },
  })
}

/**
 * Deletes a user event in Google Calendar.
 * @param {{ accessToken: string, refreshToken?: string, expiryDate?: number|null }} connection
 * @param {string} externalEventId
 * @returns {Promise<void>}
 */
export async function deleteEvent(connection, externalEventId) {
  const calendar = getCalendarClient(connection)
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: externalEventId,
    sendUpdates: 'all',
  })
}
