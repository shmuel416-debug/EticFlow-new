/**
 * EthicFlow — Calendar Service Factory
 * Dispatches calendar operations to the active provider based on CALENDAR_PROVIDER env var.
 * All providers implement: createEvent, updateEvent, deleteEvent.
 *
 * Providers: internal (default, DB-only) | microsoft | google
 * Swap provider: change CALENDAR_PROVIDER in .env and restart.
 *
 * Event data shape:
 *   { title, description, startTime, endTime, location, attendees: [{email, name}] }
 *
 * All methods degrade gracefully — calendar failures never break meeting creation.
 */

import { getCalendarProvider } from '../../config/services.js'
import * as internalProvider  from './internal.provider.js'
import * as microsoftProvider from './microsoft.provider.js'

/** @type {Record<string, object>} */
const providers = {
  internal:  internalProvider,
  microsoft: microsoftProvider,
}

/**
 * Returns the active calendar provider module.
 * @returns {{ createEvent: Function, updateEvent: Function, deleteEvent: Function }}
 * @throws {Error} If CALENDAR_PROVIDER is unknown
 */
function getProvider() {
  const name = getCalendarProvider()
  const provider = providers[name]
  if (!provider) {
    throw new Error(
      `Unknown CALENDAR_PROVIDER: "${name}". Valid options: ${Object.keys(providers).join(', ')}`
    )
  }
  return provider
}

/**
 * Creates a calendar event and returns the external event ID (or null for internal).
 * @param {{ title: string, description: string, startTime: Date, endTime: Date, location?: string, attendees: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<string|null>} External event ID, or null if no external calendar
 */
export async function createEvent(eventData) {
  return getProvider().createEvent(eventData)
}

/**
 * Updates an existing calendar event by its external ID.
 * @param {string} externalId - External calendar event ID
 * @param {{ title?: string, description?: string, startTime?: Date, endTime?: Date, location?: string, attendees?: Array<{email: string, name: string}> }} eventData
 * @returns {Promise<void>}
 */
export async function updateEvent(externalId, eventData) {
  return getProvider().updateEvent(externalId, eventData)
}

/**
 * Deletes a calendar event by its external ID.
 * @param {string} externalId - External calendar event ID
 * @returns {Promise<void>}
 */
export async function deleteEvent(externalId) {
  return getProvider().deleteEvent(externalId)
}
