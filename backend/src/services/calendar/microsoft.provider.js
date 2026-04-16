/**
 * EthicFlow — Microsoft Calendar Provider
 * Creates, updates, and deletes Outlook calendar events via Microsoft Graph API.
 * Attendees automatically receive Outlook meeting invitations.
 *
 * Uses Client Credentials flow (app-level auth) — the organizer mailbox must
 * have Calendars.ReadWrite permission granted to the Azure AD App.
 *
 * Env vars required:
 *   MICROSOFT_CALENDAR_TENANT_ID        — Azure AD tenant ID
 *   MICROSOFT_CALENDAR_CLIENT_ID        — App registration client ID
 *   MICROSOFT_CALENDAR_CLIENT_SECRET    — App registration client secret
 *   MICROSOFT_CALENDAR_ORGANIZER_EMAIL  — Mailbox used as event organizer
 */

import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'

/** Cached Graph client */
let _graphClient = null

/**
 * Returns an authenticated Microsoft Graph client for calendar operations.
 * @returns {Client}
 * @throws {Error} If required env vars are missing
 */
function getGraphClient() {
  if (_graphClient) return _graphClient

  const tenantId    = process.env.MICROSOFT_CALENDAR_TENANT_ID
  const clientId    = process.env.MICROSOFT_CALENDAR_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Microsoft Calendar provider requires MICROSOFT_CALENDAR_TENANT_ID, ' +
      'MICROSOFT_CALENDAR_CLIENT_ID, and MICROSOFT_CALENDAR_CLIENT_SECRET'
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
 * Returns the organizer email (the mailbox under which events are created).
 * @returns {string}
 * @throws {Error} If env var is missing
 */
function getOrganizerEmail() {
  const email = process.env.MICROSOFT_CALENDAR_ORGANIZER_EMAIL
  if (!email) {
    throw new Error('Microsoft Calendar provider requires MICROSOFT_CALENDAR_ORGANIZER_EMAIL')
  }
  return email
}

/**
 * Converts EthicFlow attendees array to Graph API format.
 * @param {Array<{email: string, name: string}>} attendees
 * @returns {Array<object>}
 */
function toGraphAttendees(attendees = []) {
  return attendees.map(({ email, name }) => ({
    emailAddress: { address: email, name: name || email },
    type: 'required',
  }))
}

/**
 * Builds a Graph API event body from EthicFlow event data.
 * @param {{ title: string, description: string, startTime: Date, endTime: Date, location?: string, attendees: Array<{email: string, name: string}> }} eventData
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
    location: eventData.location
      ? { displayName: eventData.location }
      : undefined,
    attendees: toGraphAttendees(eventData.attendees),
    isOnlineMeeting: false,
  }
}

/**
 * Creates an Outlook calendar event and returns the external event ID.
 * @param {{ title: string, description: string, startTime: Date, endTime: Date, location?: string, attendees: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<string|null>} External Outlook event ID, or null on failure
 */
export async function createEvent(eventData) {
  try {
    const client    = getGraphClient()
    const organizer = getOrganizerEmail()
    const body      = buildEventBody(eventData)

    const result = await client
      .api(`/users/${organizer}/events`)
      .post(body)

    return result.id ?? null
  } catch (err) {
    console.warn('[Calendar/Microsoft] createEvent failed (non-fatal):', err.message)
    return null
  }
}

/**
 * Updates an existing Outlook calendar event.
 * @param {string} externalId - Outlook event ID
 * @param {{ title?: string, description?: string, startTime?: Date, endTime?: Date, location?: string, attendees?: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<void>}
 */
export async function updateEvent(externalId, eventData) {
  try {
    const client    = getGraphClient()
    const organizer = getOrganizerEmail()
    const body      = buildEventBody(eventData)

    await client
      .api(`/users/${organizer}/events/${externalId}`)
      .patch(body)
  } catch (err) {
    console.warn('[Calendar/Microsoft] updateEvent failed (non-fatal):', err.message)
  }
}

/**
 * Deletes an Outlook calendar event by its external ID.
 * @param {string} externalId - Outlook event ID
 * @returns {Promise<void>}
 */
export async function deleteEvent(externalId) {
  try {
    const client    = getGraphClient()
    const organizer = getOrganizerEmail()

    await client
      .api(`/users/${organizer}/events/${externalId}`)
      .delete()
  } catch (err) {
    console.warn('[Calendar/Microsoft] deleteEvent failed (non-fatal):', err.message)
  }
}
