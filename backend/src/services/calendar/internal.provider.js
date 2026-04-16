/**
 * EthicFlow — Internal Calendar Provider (default)
 * No external calendar integration — meetings are stored in the DB only.
 * This is the default provider when CALENDAR_PROVIDER=internal or is not set.
 *
 * All methods are no-ops that return null.
 * Switch to microsoft/google provider for external calendar sync.
 */

/**
 * No-op: internal provider does not create external calendar events.
 * @param {object} _eventData - Ignored
 * @returns {Promise<null>}
 */
export async function createEvent(_eventData) {
  return null
}

/**
 * No-op: internal provider has nothing to update externally.
 * @param {string} _externalId - Ignored
 * @param {object} _eventData - Ignored
 * @returns {Promise<void>}
 */
export async function updateEvent(_externalId, _eventData) {
  // no-op
}

/**
 * No-op: internal provider has nothing to delete externally.
 * @param {string} _externalId - Ignored
 * @returns {Promise<void>}
 */
export async function deleteEvent(_externalId) {
  // no-op
}
