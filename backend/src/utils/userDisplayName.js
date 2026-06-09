/**
 * Ethic-Net — User display name resolver
 * Picks locale-appropriate full name from bilingual user fields.
 */

/**
 * Returns the display name for a user based on UI language.
 * Hebrew UI prefers fullNameHe, English UI prefers fullName, with cross-fallback.
 * @param {{ fullName?: string|null, fullNameHe?: string|null }|null|undefined} user
 * @param {'he'|'en'|string} [lang='he']
 * @returns {string}
 */
export function getUserDisplayName(user, lang = 'he') {
  const he = user?.fullNameHe?.trim()
  const en = user?.fullName?.trim()
  return lang === 'en' ? (en || he || '') : (he || en || '')
}
