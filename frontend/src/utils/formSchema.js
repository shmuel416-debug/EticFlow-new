/**
 * EthicFlow — form schema utilities.
 * Normalizes legacy and section-based dynamic form schemas for rendering.
 */

/**
 * Returns a flat field list from supported form schema shapes.
 * @param {object|null|undefined} schemaJson - Stored form schema JSON.
 * @returns {object[]} Flat list of field definitions.
 */
export function getSchemaFields(schemaJson) {
  if (Array.isArray(schemaJson?.fields)) return schemaJson.fields
  if (!Array.isArray(schemaJson?.sections)) return []

  return schemaJson.sections.flatMap((section) => (
    Array.isArray(section?.fields) ? section.fields : []
  ))
}
