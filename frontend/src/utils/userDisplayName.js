/**
 * Ethic-Net — User display name resolver (frontend)
 * Picks locale-appropriate full name from bilingual user fields.
 */

/**
 * Returns the display name for a user based on UI language.
 * @param {{ fullName?: string|null, fullNameHe?: string|null }|null|undefined} user
 * @param {'he'|'en'|string} lang
 * @returns {string}
 */
export function getUserDisplayName(user, lang) {
  const he = user?.fullNameHe?.trim()
  const en = user?.fullName?.trim()
  return lang === 'en' ? (en || he || '') : (he || en || '')
}

/**
 * Returns the first token of the locale-appropriate display name.
 * @param {{ fullName?: string|null, fullNameHe?: string|null }|null|undefined} user
 * @param {'he'|'en'|string} lang
 * @returns {string}
 */
export function getUserFirstName(user, lang) {
  const display = getUserDisplayName(user, lang)
  return display.split(/\s+/)[0] || display
}
