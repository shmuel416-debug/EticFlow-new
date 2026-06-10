/**
 * Ethic-Net — Researcher-facing status display helpers
 * Maps internal workflow statuses to simplified labels shown to researchers.
 */

/** Internal statuses collapsed to a single researcher-friendly label key. */
export const RESEARCHER_STATUS_ALIASES = {
  IN_TRIAGE: 'UNDER_PROFESSIONAL_REVIEW',
  ASSIGNED: 'UNDER_PROFESSIONAL_REVIEW',
  ASSIGNED_SECONDARY: 'UNDER_PROFESSIONAL_REVIEW',
  IN_REVIEW: 'UNDER_PROFESSIONAL_REVIEW',
}

/**
 * Returns the status code to display for a given audience.
 * @param {string} status - Canonical submission status code
 * @param {'researcher'|'staff'} [audience='staff']
 * @returns {string}
 */
export function getDisplayStatusCode(status, audience = 'staff') {
  if (audience !== 'researcher') return status
  return RESEARCHER_STATUS_ALIASES[status] || status
}
