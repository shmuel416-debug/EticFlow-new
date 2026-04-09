/**
 * EthicFlow — Form Builder Field Type Definitions
 * Defines palette categories, icons, and per-type color tokens.
 * All labels are i18n keys under secretary.fieldTypes.*
 */

/** @typedef {{ type: string, icon: string }} PaletteItem */

/** Palette sections — order matches the approved Lev design */
export const FIELD_CATEGORIES = [
  {
    key: 'basic',
    i18nKey: 'secretary.formBuilder.categoryBasic',
    items: [
      { type: 'text',     icon: '✏️' },
      { type: 'textarea', icon: '📝' },
      { type: 'date',     icon: '📅' },
      { type: 'number',   icon: '🔢' },
      { type: 'email',    icon: '✉️' },
      { type: 'phone',    icon: '📞' },
    ],
  },
  {
    key: 'selection',
    i18nKey: 'secretary.formBuilder.categorySelection',
    items: [
      { type: 'select',   icon: '⬇️' },
      { type: 'radio',    icon: '🔘' },
      { type: 'checkbox', icon: '☑️' },
    ],
  },
  {
    key: 'special',
    i18nKey: 'secretary.formBuilder.categorySpecial',
    items: [
      { type: 'file',        icon: '📎' },
      { type: 'declaration', icon: '📋' },
      { type: 'signature',   icon: '✍️' },
    ],
  },
]

/**
 * Badge background color per field type.
 * Uses Lev palette — all pass WCAG AA on white bg.
 */
export const FIELD_TYPE_COLOR = {
  text:        'var(--lev-navy)',
  textarea:    'var(--lev-navy)',
  date:        '#16a34a',
  number:      '#0891b2',
  email:       '#6d28d9',
  phone:       '#6d28d9',
  select:      'var(--lev-purple)',
  radio:       'var(--lev-purple)',
  checkbox:    'var(--lev-purple)',
  file:        '#b45309',
  declaration: '#b45309',
  signature:   '#dc2626',
}

/**
 * Creates a blank field object for the canvas.
 * @param {string} type - field type key
 * @returns {object} new field with generated id
 */
export function createField(type) {
  return {
    id:           Math.random().toString(36).slice(2, 10),
    type,
    labelHe:      '',
    labelEn:      '',
    placeholderHe: '',
    required:     true,
    validation:   { minLength: null, maxLength: null },
    conditions:   [],
  }
}
