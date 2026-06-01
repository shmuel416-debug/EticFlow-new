/**
 * Ethic-Net — Form schema helpers (frontend).
 * Normalizes dynamic schema shapes to a unified fields array.
 */

/**
 * Flattens supported form schema shapes into a single field list.
 * Supports `schema.fields` and `schema.sections[].fields`.
 * @param {unknown} schemaJson
 * @returns {Array<Record<string, unknown>>}
 */
export function flattenSchemaFields(schemaJson) {
  if (!schemaJson || typeof schemaJson !== 'object') return []
  if (Array.isArray(schemaJson.fields)) return schemaJson.fields.filter(Boolean)
  if (!Array.isArray(schemaJson.sections)) return []
  return schemaJson.sections.flatMap((section) =>
    Array.isArray(section?.fields) ? section.fields.filter(Boolean) : []
  )
}
