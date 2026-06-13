/**
 * Ethic-Net — FieldSettingsPanel
 * Edit panel for the currently selected canvas field.
 * Bilingual labels (he + en), required toggle (role="switch"), validation ranges.
 * @module components/formBuilder/FieldSettingsPanel
 */

import { useLayoutEffect, useState, useImperativeHandle, forwardRef, useRef } from 'react'
import { useTranslation }        from 'react-i18next'
import { Plus, Trash2 }          from 'lucide-react'
import { FIELD_TYPE_COLOR, CHOICE_FIELD_TYPES, createOption } from './fieldTypes'
import ConditionEditor from './ConditionEditor'
import { normalizeConditions } from '../../utils/formConditions.js'

/**
 * Builds the update payload from a field draft.
 * @param {object} draft
 * @returns {object}
 */
function buildFieldUpdates(draft) {
  const isChoiceField = CHOICE_FIELD_TYPES.includes(draft.type)
  return {
    labelHe:       draft.labelHe,
    labelEn:       draft.labelEn,
    placeholderHe: draft.placeholderHe,
    required:      draft.required,
    validation:    draft.validation,
    conditions:    normalizeConditions(draft.conditions),
    ...(isChoiceField ? { options: draft.options ?? [] } : {}),
  }
}

/**
 * Edits a single field; remounted when selection changes so pending edits auto-commit on unmount.
 * @param {{
 *   field:      object,
 *   allFields:  object[],
 *   onSave:     (id: string, updates: object) => void,
 *   onCancel:   () => void,
 *   onDraftChange?: () => void,
 * }} props
 */
const FieldSettingsEditor = forwardRef(function FieldSettingsEditor(
  { field, allFields = [], onSave, onCancel, onDraftChange },
  ref
) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => ({ ...field }))
  const draftRef = useRef(draft)
  const syncedFieldRef = useRef({ ...field })
  const onSaveRef = useRef(onSave)

  useLayoutEffect(() => {
    draftRef.current = draft
    onSaveRef.current = onSave
  }, [draft, onSave])

  useLayoutEffect(() => {
    return () => {
      const current = draftRef.current
      const baseline = syncedFieldRef.current
      if (!current || !baseline) return
      const updates = buildFieldUpdates(current)
      if (JSON.stringify(updates) !== JSON.stringify(buildFieldUpdates(baseline))) {
        onSaveRef.current(current.id, updates)
      }
    }
  }, [field.id])

  useImperativeHandle(ref, () => ({
    /**
     * Commits pending panel edits to parent state.
     * @returns {{ id: string, updates: object }|null}
     */
    commitDraft() {
      const current = draftRef.current
      const baseline = syncedFieldRef.current
      if (!current || !baseline) return null
      const updates = buildFieldUpdates(current)
      if (JSON.stringify(updates) === JSON.stringify(buildFieldUpdates(baseline))) return null
      onSaveRef.current(current.id, updates)
      syncedFieldRef.current = { ...current, ...updates }
      return { id: current.id, updates }
    },
    /** @returns {boolean} */
    hasDraftChanges() {
      const current = draftRef.current
      const baseline = syncedFieldRef.current
      if (!current || !baseline) return false
      return JSON.stringify(buildFieldUpdates(current))
        !== JSON.stringify(buildFieldUpdates(baseline))
    },
  }), [])

  /** @param {Partial<object>} updates */
  const patch = (updates) => {
    setDraft(prev => ({ ...prev, ...updates }))
    onDraftChange?.()
  }

  const badgeColor = FIELD_TYPE_COLOR[draft.type] ?? 'var(--lev-navy)'
  const isChoiceField = CHOICE_FIELD_TYPES.includes(draft.type)
  const options = draft.options ?? []

  /** Adds a new blank option to the draft. */
  const addOption = () => patch({ options: [...options, createOption()] })

  /** Removes the option at the given index. */
  const removeOption = (index) =>
    patch({ options: options.filter((_, i) => i !== index) })

  /**
   * Updates a single field on the option at the given index.
   * @param {number} index
   * @param {'labelHe'|'labelEn'} key
   * @param {string} value
   */
  const updateOption = (index, key, value) =>
    patch({
      options: options.map((opt, i) => (i === index ? { ...opt, [key]: value } : opt)),
    })

  const handleSave = () => {
    const updates = buildFieldUpdates(draft)
    onSave(draft.id, updates)
    syncedFieldRef.current = { ...draft, ...updates }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Field type indicator */}
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 shrink-0">
        <span className="text-white text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: badgeColor }} aria-hidden="true">
          {t(`secretary.fieldTypes.${draft.type}`)}
        </span>
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--lev-navy)' }}>
          {draft.labelHe || draft.labelEn || t(`secretary.fieldTypes.${draft.type}`)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>

        {/* Hebrew label */}
        <div>
          <label htmlFor="lbl-he" className="block text-xs font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('secretary.formBuilder.settingsLabelHe')} <span className="text-red-500" aria-label="שדה חובה">*</span>
          </label>
          <input id="lbl-he" type="text" aria-required="true"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
            onFocus={e  => (e.target.style.borderColor = 'var(--lev-teal)')}
            onBlur={e   => (e.target.style.borderColor = '')}
            value={draft.labelHe}
            onChange={e => patch({ labelHe: e.target.value })}
          />
        </div>

        {/* English label */}
        <div>
          <label htmlFor="lbl-en" className="block text-xs font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('secretary.formBuilder.settingsLabelEn')} <span className="text-red-500" aria-label="required">*</span>
          </label>
          <input id="lbl-en" type="text" dir="ltr" aria-required="true"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none text-left"
            onFocus={e  => (e.target.style.borderColor = 'var(--lev-teal)')}
            onBlur={e   => (e.target.style.borderColor = '')}
            value={draft.labelEn}
            onChange={e => patch({ labelEn: e.target.value })}
          />
        </div>

        {/* Placeholder */}
        <div>
          <label htmlFor="lbl-ph" className="block text-xs font-semibold mb-1 text-gray-500">
            {t('secretary.formBuilder.settingsPlaceholder')}
          </label>
          <input id="lbl-ph" type="text"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
            onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
            onBlur={e  => (e.target.style.borderColor = '')}
            value={draft.placeholderHe}
            onChange={e => patch({ placeholderHe: e.target.value })}
          />
        </div>

        {/* Choice options editor (select / radio / checkbox) */}
        {isChoiceField && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
              {t('secretary.formBuilder.settingsOptionsTitle')}
            </p>
            <p className="text-xs text-gray-400 mb-2">{t('secretary.formBuilder.settingsOptionsHint')}</p>

            {options.length === 0 && (
              <p className="text-xs text-gray-400 mb-2">{t('secretary.formBuilder.settingsNoOptions')}</p>
            )}

            <div className="space-y-2">
              {options.map((opt, index) => (
                <div
                  key={opt.value}
                  className="rounded-lg border border-gray-200 p-2 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">
                      {t('secretary.formBuilder.settingsOptionLabel', { index: index + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label={t('secretary.formBuilder.settingsRemoveOption', { index: index + 1 })}
                      className="inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      style={{ minWidth: 36, minHeight: 36 }}
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                    </button>
                  </div>
                  <input
                    type="text"
                    aria-label={`${t('secretary.formBuilder.settingsOptionLabel', { index: index + 1 })} — ${t('secretary.formBuilder.settingsOptionHe')}`}
                    placeholder={t('secretary.formBuilder.settingsOptionHe')}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none"
                    onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
                    onBlur={e  => (e.target.style.borderColor = '')}
                    value={opt.labelHe ?? ''}
                    onChange={e => updateOption(index, 'labelHe', e.target.value)}
                  />
                  <input
                    type="text"
                    dir="ltr"
                    aria-label={`${t('secretary.formBuilder.settingsOptionLabel', { index: index + 1 })} — ${t('secretary.formBuilder.settingsOptionEn')}`}
                    placeholder={t('secretary.formBuilder.settingsOptionEn')}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none text-left"
                    onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
                    onBlur={e  => (e.target.style.borderColor = '')}
                    value={opt.labelEn ?? ''}
                    onChange={e => updateOption(index, 'labelEn', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold transition hover:opacity-80"
              style={{ color: 'var(--lev-teal-text)', minHeight: 44 }}
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formBuilder.settingsAddOption')}
            </button>
          </div>
        )}

        {/* Required toggle */}
        <div className="flex items-center justify-between py-1">
          <span className="text-sm font-medium" style={{ color: '#374151' }}>
            {t('secretary.formBuilder.settingsRequired')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.required}
            aria-label={`${t('secretary.formBuilder.settingsRequired')} — ${draft.required ? t('secretary.formBuilder.switchOn') : t('secretary.formBuilder.switchOff')}`}
            onClick={() => patch({ required: !draft.required })}
            className="w-10 h-5 rounded-full relative transition-colors"
            style={{ background: draft.required ? 'var(--lev-navy)' : '#d1d5db', minWidth: '40px', minHeight: '20px' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
              style={{ [draft.required ? 'right' : 'left']: '2px' }}
            />
          </button>
        </div>

        {/* Validation */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--lev-navy)' }}>{t('secretary.formBuilder.settingsValidationTitle')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'minLength', label: t('secretary.formBuilder.settingsMinLength') },
              { key: 'maxLength', label: t('secretary.formBuilder.settingsMaxLength') },
            ].map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`val-${key}`} className="block text-xs text-gray-500 mb-1">{label}</label>
                <input id={`val-${key}`} type="number" min="0"
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 text-center focus:outline-none"
                  onFocus={e => (e.target.style.borderColor = 'var(--lev-teal)')}
                  onBlur={e  => (e.target.style.borderColor = '')}
                  value={draft.validation[key] ?? ''}
                  onChange={e => patch({ validation: { ...draft.validation, [key]: e.target.value ? Number(e.target.value) : null } })}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Conditional logic */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('secretary.formBuilder.settingsConditional')}
          </p>
          <p className="text-xs text-gray-400 mb-2">{t('secretary.formBuilder.settingsConditionalHint')}</p>
          <ConditionEditor
            conditions={draft.conditions}
            targetFieldId={draft.id}
            allFields={allFields}
            onChange={next => patch({ conditions: next })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex gap-2 shrink-0">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          style={{ minHeight: '44px' }}>
          {t('common.cancel')}
        </button>
        <button type="button" onClick={handleSave}
          className="flex-1 py-2.5 text-sm text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
          {t('secretary.formBuilder.settingsSave')}
        </button>
      </div>
    </div>
  )
})

/**
 * @param {{
 *   field:      object | null,
 *   allFields:  object[],
 *   onSave:     (id: string, updates: object) => void,
 *   onCancel:   () => void,
 *   onDraftChange?: () => void,
 * }} props
 */
const FieldSettingsPanel = forwardRef(function FieldSettingsPanel(
  { field, allFields = [], onSave, onCancel, onDraftChange },
  ref
) {
  const { t } = useTranslation()
  const editorRef = useRef(null)

  useImperativeHandle(ref, () => ({
    commitDraft: () => editorRef.current?.commitDraft?.() ?? null,
    hasDraftChanges: () => editorRef.current?.hasDraftChanges?.() ?? false,
  }), [])

  if (!field) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-400">{t('secretary.formBuilder.noFieldSelected')}</p>
      </div>
    )
  }

  return (
    <FieldSettingsEditor
      key={field.id}
      ref={editorRef}
      field={field}
      allFields={allFields}
      onSave={onSave}
      onCancel={onCancel}
      onDraftChange={onDraftChange}
    />
  )
})

export default FieldSettingsPanel
