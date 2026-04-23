/**
 * EthicFlow — Form Builder Field Type Definitions
 * Palette categories with lucide icons (monochrome, brand-consistent).
 * Labels use i18n keys under secretary.fieldTypes.*
 */

import {
  Type,
  FileText,
  Calendar,
  Hash,
  Mail,
  Phone,
  ChevronDown,
  CircleDot,
  CheckSquare,
  Paperclip,
  ClipboardList,
  PenLine,
} from 'lucide-react'

/** Palette sections — order matches Lev design */
export const FIELD_CATEGORIES = [
  {
    key: 'basic',
    i18nKey: 'secretary.formBuilder.categoryBasic',
    items: [
      { type: 'text',     Icon: Type },
      { type: 'textarea', Icon: FileText },
      { type: 'date',     Icon: Calendar },
      { type: 'number',   Icon: Hash },
      { type: 'email',    Icon: Mail },
      { type: 'phone',    Icon: Phone },
    ],
  },
  {
    key: 'selection',
    i18nKey: 'secretary.formBuilder.categorySelection',
    items: [
      { type: 'select',   Icon: ChevronDown },
      { type: 'radio',    Icon: CircleDot },
      { type: 'checkbox', Icon: CheckSquare },
    ],
  },
  {
    key: 'special',
    i18nKey: 'secretary.formBuilder.categorySpecial',
    items: [
      { type: 'file',        Icon: Paperclip },
      { type: 'declaration', Icon: ClipboardList },
      { type: 'signature',   Icon: PenLine },
    ],
  },
]

/**
 * Badge background color per field type.
 * Uses Lev palette — contrast checked for UI chrome.
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
