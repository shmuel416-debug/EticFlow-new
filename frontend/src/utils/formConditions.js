/**
 * Ethic-Net — Form conditional visibility utilities
 * Evaluates AND/OR rule groups for dynamic form fields at build and submit time.
 * @module utils/formConditions
 */

/** @typedef {'equals'|'not_equals'|'contains'|'not_contains'|'empty'|'not_empty'} ConditionOperator */
/** @typedef {'AND'|'OR'} ConditionLogic */

/**
 * @typedef {object} ConditionRule
 * @property {string} fieldId - Source field id
 * @property {ConditionOperator} operator
 * @property {string|number|boolean|string[]|undefined} [value]
 */

/**
 * @typedef {object} FieldConditions
 * @property {ConditionLogic} [logic]
 * @property {ConditionRule[]} [rules]
 */

/** Operators that do not require a comparison value. */
export const VALUELESS_OPERATORS = new Set(['empty', 'not_empty'])

/** Text-like field types supporting contains operators. */
export const TEXT_LIKE_TYPES = new Set(['text', 'textarea', 'email', 'phone'])

/** Choice field types with discrete option values. */
export const CHOICE_TYPES = new Set(['select', 'radio', 'checkbox'])

/**
 * Returns supported operators for a given source field type.
 * @param {string} fieldType
 * @returns {ConditionOperator[]}
 */
export function getOperatorsForFieldType(fieldType) {
  if (TEXT_LIKE_TYPES.has(fieldType)) {
    return ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty']
  }
  if (fieldType === 'number' || fieldType === 'date') {
    return ['equals', 'not_equals', 'empty', 'not_empty']
  }
  if (CHOICE_TYPES.has(fieldType)) {
    return ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty']
  }
  return ['equals', 'not_equals', 'empty', 'not_empty']
}

/**
 * Resolves a field's stable id (id or legacy key).
 * @param {object} field
 * @returns {string|undefined}
 */
export function getFieldId(field) {
  return field?.id || field?.key
}

/**
 * Checks whether a form value is considered empty.
 * @param {*} value
 * @returns {boolean}
 */
export function isEmptyValue(value) {
  if (value === undefined || value === null || value === '') return true
  if (value === false) return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/**
 * Evaluates a single condition rule against current form values.
 * @param {ConditionRule} rule
 * @param {Record<string, *>} values
 * @returns {boolean}
 */
export function evaluateRule(rule, values) {
  const sourceValue = values[rule.fieldId]

  switch (rule.operator) {
    case 'empty':
      return isEmptyValue(sourceValue)
    case 'not_empty':
      return !isEmptyValue(sourceValue)
    case 'equals':
      if (Array.isArray(sourceValue)) {
        return Array.isArray(rule.value)
          ? rule.value.every(v => sourceValue.includes(v))
          : sourceValue.includes(rule.value)
      }
      return String(sourceValue ?? '') === String(rule.value ?? '')
    case 'not_equals':
      if (Array.isArray(sourceValue)) {
        return Array.isArray(rule.value)
          ? !rule.value.every(v => sourceValue.includes(v))
          : !sourceValue.includes(rule.value)
      }
      return String(sourceValue ?? '') !== String(rule.value ?? '')
    case 'contains': {
      if (Array.isArray(sourceValue)) {
        return sourceValue.includes(rule.value)
      }
      return String(sourceValue ?? '').includes(String(rule.value ?? ''))
    }
    case 'not_contains': {
      if (Array.isArray(sourceValue)) {
        return !sourceValue.includes(rule.value)
      }
      return !String(sourceValue ?? '').includes(String(rule.value ?? ''))
    }
    default:
      return true
  }
}

/**
 * Normalizes legacy empty array or missing conditions to null (always visible).
 * @param {FieldConditions|ConditionRule[]|null|undefined} conditions
 * @returns {FieldConditions|null}
 */
export function normalizeConditions(conditions) {
  if (!conditions) return null
  if (Array.isArray(conditions)) {
    if (conditions.length === 0) return null
    return { logic: 'AND', rules: conditions }
  }
  if (!conditions.rules || conditions.rules.length === 0) return null
  return {
    logic: conditions.logic === 'OR' ? 'OR' : 'AND',
    rules: conditions.rules,
  }
}

/**
 * Determines whether a field should be visible given current values.
 * @param {object} field - Target field with optional conditions
 * @param {Record<string, *>} values - Current form values keyed by field id
 * @param {object[]} [_allFields] - Reserved for future cascading rules
 * @returns {boolean}
 */
export function evaluateFieldVisibility(field, values, _allFields = []) {
  const conditions = normalizeConditions(field?.conditions)
  if (!conditions) return true

  const results = conditions.rules.map(rule => evaluateRule(rule, values))
  return conditions.logic === 'OR'
    ? results.some(Boolean)
    : results.every(Boolean)
}

/**
 * Returns fields that are visible under current values.
 * @param {object[]} fields
 * @param {Record<string, *>} values
 * @returns {object[]}
 */
export function filterVisibleFields(fields, values) {
  return fields.filter(field => evaluateFieldVisibility(field, values, fields))
}

/**
 * Returns field ids that are currently hidden.
 * @param {object[]} fields
 * @param {Record<string, *>} values
 * @returns {string[]}
 */
export function getHiddenFieldIds(fields, values) {
  return fields
    .filter(field => !evaluateFieldVisibility(field, values, fields))
    .map(field => getFieldId(field))
    .filter(Boolean)
}

/**
 * Source fields eligible as condition triggers for a target field (must appear before it).
 * @param {string} targetFieldId
 * @param {object[]} fields
 * @returns {object[]}
 */
export function getEligibleSourceFields(targetFieldId, fields) {
  const targetIndex = fields.findIndex(f => getFieldId(f) === targetFieldId)
  if (targetIndex <= 0) return []
  return fields.slice(0, targetIndex)
}

/**
 * Detects circular dependencies in field condition graphs.
 * @param {object[]} fields
 * @returns {{ valid: boolean, error?: 'cycle'|'missing_field', fieldId?: string }}
 */
export function validateConditionGraph(fields) {
  const fieldIds = new Set(fields.map(getFieldId).filter(Boolean))
  const indexById = new Map(fields.map((f, i) => [getFieldId(f), i]))

  /** @param {string} startId @param {Set<string>} stack */
  function hasCycleFrom(startId, stack) {
    const field = fields.find(f => getFieldId(f) === startId)
    const conditions = normalizeConditions(field?.conditions)
    if (!conditions) return false

    for (const rule of conditions.rules) {
      if (!fieldIds.has(rule.fieldId)) {
        return { error: 'missing_field', fieldId: startId }
      }
      const sourceIndex = indexById.get(rule.fieldId)
      const targetIndex = indexById.get(startId)
      if (sourceIndex === undefined || targetIndex === undefined || sourceIndex >= targetIndex) {
        return { error: 'missing_field', fieldId: startId }
      }
      if (stack.has(rule.fieldId)) {
        return { error: 'cycle', fieldId: startId }
      }
      stack.add(rule.fieldId)
      const nested = hasCycleFrom(rule.fieldId, stack)
      stack.delete(rule.fieldId)
      if (nested) return nested
    }
    return false
  }

  for (const field of fields) {
    const id = getFieldId(field)
    if (!id) continue
    const result = hasCycleFrom(id, new Set())
    if (result) return { valid: false, ...result }
  }
  return { valid: true }
}

/**
 * Strips values for fields that are not visible.
 * @param {Record<string, *>} values
 * @param {object[]} fields
 * @returns {Record<string, *>}
 */
export function stripHiddenFieldValues(values, fields) {
  const hidden = new Set(getHiddenFieldIds(fields, values))
  if (hidden.size === 0) return values
  const next = { ...values }
  for (const id of hidden) {
    delete next[id]
  }
  return next
}
