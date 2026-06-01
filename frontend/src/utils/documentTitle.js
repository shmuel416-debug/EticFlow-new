/**
 * Ethic-Net — Browser tab title helpers
 * Builds "{pageTitle} | {siteTitle}" for document.title with safe truncation.
 */

import i18n from '../services/i18n'

const MAX_PAGE_PART_LEN = 60

/**
 * Returns the localized site name used as the tab title suffix.
 * @returns {string}
 */
export function getSiteTitle() {
  return i18n.t('common.browserTitle')
}

/**
 * Truncates long page-specific title segments for narrow browser tabs.
 * @param {string} value
 * @returns {string}
 */
function truncatePagePart(value) {
  const trimmed = value.trim()
  if (trimmed.length <= MAX_PAGE_PART_LEN) return trimmed
  return `${trimmed.slice(0, MAX_PAGE_PART_LEN - 1)}…`
}

/**
 * Builds a full document.title from a page-specific segment.
 * @param {string|null|undefined} pageTitle
 * @returns {string}
 */
export function buildDocumentTitle(pageTitle) {
  const siteTitle = getSiteTitle()
  if (typeof pageTitle !== 'string' || !pageTitle.trim()) {
    return siteTitle
  }
  return `${truncatePagePart(pageTitle)} | ${siteTitle}`
}

/**
 * Combines entity identifiers for detail pages (e.g. applicationId + research title).
 * @param {string|null|undefined} primary - Usually applicationId or protocol id label
 * @param {string|null|undefined} secondary - Usually human-readable name
 * @param {string} [fallback=''] - Used when both parts are empty
 * @returns {string}
 */
export function buildEntityDocumentTitle(primary, secondary, fallback = '') {
  const parts = [primary, secondary].filter(
    (value) => typeof value === 'string' && value.trim()
  )
  if (parts.length === 0) return fallback
  return parts.join(' — ')
}

/**
 * Resets document.title to the default site branding.
 * @returns {void}
 */
export function applyDefaultDocumentTitle() {
  document.title = getSiteTitle()
}
