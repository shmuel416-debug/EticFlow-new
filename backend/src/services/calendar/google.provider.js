/**
 * EthicFlow — Google Calendar Provider
 * Creates, updates, and deletes Google Calendar events via Google Calendar API v3.
 * Attendees automatically receive Google Calendar invitations.
 *
 * Uses a Service Account with domain-wide delegation, OR a standard service account
 * that creates events on a shared calendar (GOOGLE_CALENDAR_ID).
 *
 * Env vars required:
 *   GOOGLE_CALENDAR_CREDENTIALS  — Path to service account JSON file, OR
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — Inline JSON string of the service account
 *   GOOGLE_CALENDAR_ID           — Target calendar ID (e.g. primary or shared calendar email)
 *   GOOGLE_CALENDAR_IMPERSONATE  — (Optional) Email to impersonate via domain-wide delegation
 */

import { google } from 'googleapis'

/** @type {import('googleapis').calendar_v3.Calendar|null} */
let _calendarClient = null

/**
 * Parses service account credentials from env (file path or inline JSON).
 * @returns {object} Parsed credentials object
 * @throws {Error} If neither env var is set
 */
function parseCredentials() {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const credsFile = process.env.GOOGLE_CALENDAR_CREDENTIALS

  if (credsJson) {
    return JSON.parse(credsJson)
  }

  if (credsFile) {
    const { readFileSync } = await import('fs')
    return JSON.parse(readFileSync(credsFile, 'utf8'))
  }

  throw new Error(
    'Google Calendar provider requires GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_CREDENTIALS'
  )
}

/**
 * Returns an authenticated Google Calendar client (cached).
 * @returns {Promise<import('googleapis').calendar_v3.Calendar>}
 */
async function getCalendarClient() {
  if (_calendarClient) return _calendarClient

  const credentials = parseCredentials()
  const impersonate  = process.env.GOOGLE_CALENDAR_IMPERSONATE

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
    ...(impersonate ? { clientOptions: { subject: impersonate } } : {}),
  })

  _calendarClient = google.calendar({ version: 'v3', auth })
  return _calendarClient
}

/**
 * Returns the target calendar ID from env.
 * @returns {string}
 * @throws {Error} If env var is missing
 */
function getCalendarId() {
  const id = process.env.GOOGLE_CALENDAR_ID
  if (!id) {
    throw new Error('Google Calendar provider requires GOOGLE_CALENDAR_ID')
  }
  return id
}

/**
 * Converts EthicFlow attendees array to Google Calendar attendees format.
 * @param {Array<{email: string, name: string}>} attendees
 * @returns {Array<{email: string, displayName: string}>}
 */
function toGoogleAttendees(attendees = []) {
  return attendees.map(({ email, name }) => ({
    email,
    displayName: name || email,
    responseStatus: 'needsAction',
  }))
}

/**
 * Builds a Google Calendar event resource from EthicFlow event data.
 * @param {{ title: string, description: string, startTime: Date, endTime: Date, location?: string, attendees: Array<{email: string, name: string}> }} eventData
 * @returns {object} Google Calendar event resource
 */
function buildEventResource(eventData) {
  return {
    summary:     eventData.title,
    description: eventData.description || '',
    start: {
      dateTime: new Date(eventData.startTime).toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    end: {
      dateTime: new Date(eventData.endTime).toISOString(),
      timeZone: 'Asia/Jerusalem',
    },
    location:  eventData.location || undefined,
    attendees: toGoogleAttendees(eventData.attendees),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
    guestsCanSeeOtherGuests: false,
  }
}

/**
 * Creates a Google Calendar event and returns the external event ID.
 * @param {{ title: string, description: string, startTime: Date, endTime: Date, location?: string, attendees: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<string|null>} Google Calendar event ID, or null on failure
 */
export async function createEvent(eventData) {
  try {
    const calendar = await getCalendarClient()
    const calendarId = getCalendarId()

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: 'all',
      requestBody: buildEventResource(eventData),
    })

    return response.data.id ?? null
  } catch (err) {
    console.warn('[Calendar/Google] createEvent failed (non-fatal):', err.message)
    return null
  }
}

/**
 * Updates an existing Google Calendar event.
 * @param {string} externalId - Google Calendar event ID
 * @param {{ title?: string, description?: string, startTime?: Date, endTime?: Date, location?: string, attendees?: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<void>}
 */
export async function updateEvent(externalId, eventData) {
  try {
    const calendar   = await getCalendarClient()
    const calendarId = getCalendarId()

    await calendar.events.patch({
      calendarId,
      eventId:     externalId,
      sendUpdates: 'all',
      requestBody: buildEventResource(eventData),
    })
  } catch (err) {
    console.warn('[Calendar/Google] updateEvent failed (non-fatal):', err.message)
  }
}

/**
 * Deletes a Google Calendar event by its external ID.
 * @param {string} externalId - Google Calendar event ID
 * @returns {Promise<void>}
 */
export async function deleteEvent(externalId) {
  try {
    const calendar   = await getCalendarClient()
    const calendarId = getCalendarId()

    await calendar.events.delete({
      calendarId,
      eventId:     externalId,
      sendUpdates: 'all',
    })
  } catch (err) {
    console.warn('[Calendar/Google] deleteEvent failed (non-fatal):', err.message)
  }
}
