/**
 * Ethic-Net — formConditions utility tests (imports frontend util)
 */

import { jest } from '@jest/globals'
import {
  evaluateFieldVisibility,
  filterVisibleFields,
  validateConditionGraph,
  stripHiddenFieldValues,
  normalizeConditions,
} from '../../frontend/src/utils/formConditions.js'

describe('formConditions', () => {
  const fields = [
    { id: 'a', type: 'radio', labelHe: 'A', options: [{ value: 'yes', labelHe: 'כן' }, { value: 'no', labelHe: 'לא' }] },
    {
      id: 'b',
      type: 'text',
      labelHe: 'B',
      conditions: {
        logic: 'AND',
        rules: [{ fieldId: 'a', operator: 'equals', value: 'yes' }],
      },
    },
    {
      id: 'c',
      type: 'text',
      labelHe: 'C',
      conditions: {
        logic: 'OR',
        rules: [
          { fieldId: 'a', operator: 'equals', value: 'no' },
          { fieldId: 'b', operator: 'not_empty' },
        ],
      },
    },
  ]

  test('normalizeConditions treats empty rules as always visible', () => {
    expect(normalizeConditions({ logic: 'AND', rules: [] })).toBeNull()
    expect(normalizeConditions([])).toBeNull()
  })

  test('AND rule hides field until source matches', () => {
    expect(evaluateFieldVisibility(fields[1], { a: 'no' }, fields)).toBe(false)
    expect(evaluateFieldVisibility(fields[1], { a: 'yes' }, fields)).toBe(true)
  })

  test('OR rule shows field when any rule matches', () => {
    expect(evaluateFieldVisibility(fields[2], { a: 'no', b: '' }, fields)).toBe(true)
    expect(evaluateFieldVisibility(fields[2], { a: 'yes', b: '' }, fields)).toBe(false)
    expect(evaluateFieldVisibility(fields[2], { a: 'yes', b: 'filled' }, fields)).toBe(true)
  })

  test('filterVisibleFields returns only visible fields', () => {
    const visible = filterVisibleFields(fields, { a: 'yes', b: 'x' })
    expect(visible.map(f => f.id)).toEqual(['a', 'b', 'c'])
    const onlyA = filterVisibleFields(fields, { a: 'no' })
    expect(onlyA.map(f => f.id)).toEqual(['a', 'c'])
  })

  test('validateConditionGraph detects forward-reference as invalid', () => {
    const bad = [
      { id: 'x', conditions: { logic: 'AND', rules: [{ fieldId: 'y', operator: 'equals', value: '1' }] } },
      { id: 'y' },
    ]
    const result = validateConditionGraph(bad)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('missing_field')
  })

  test('stripHiddenFieldValues removes values for hidden fields', () => {
    const values = { a: 'no', b: 'secret', c: 'also' }
    const stripped = stripHiddenFieldValues(values, fields)
    expect(stripped).toEqual({ a: 'no', c: 'also' })
  })
})
