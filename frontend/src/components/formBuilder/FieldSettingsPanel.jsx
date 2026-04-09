/**
 * EthicFlow — FieldSettingsPanel
 * Edit panel for the currently selected canvas field.
 * Bilingual labels (he + en), required toggle (role="switch"), validation ranges.
 * @module components/formBuilder/FieldSettingsPanel
 */

import { useEffect, useState }  from 'react'
import { useTranslation }        from 'react-i18next'
import { FIELD_TYPE_COLOR }      from './fieldTypes'

/**
 * @param {{
 *   field:    object | null,
 *   onSave:   (id: string, updates: object) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function FieldSettingsPanel({ field, onSave, onCancel }) {
  const { t } = useTranslation()

  const [draft, setDraft] = useState(null)

  /* Sync local draft when selected field changes */
  useEffect(() => {
    setDraft(field ? { ...field } : null)
  }, [field?.id])

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-400">{t('secretary.formBuilder.noFieldSelected')}</p>
      </div>
    )
  }

  /** @param {Partial<object>} updates */
  const patch = (updates) => setDraft(prev => ({ ...prev, ...updates }))

  const badgeColor = FIELD_TYPE_COLOR[draft.type] ?? 'var(--lev-navy)'

  const handleSave = () => onSave(draft.id, {
    labelHe:       draft.labelHe,
    labelEn:       draft.labelEn,
    placeholderHe: draft.placeholderHe,
    required:      draft.required,
    validation:    draft.validation,
  })

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

        {/* Conditional logic (placeholder) */}
        <div className="border-t pt-3">
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('secretary.formBuilder.settingsConditional')}
          </p>
          <p className="text-xs text-gray-400 mb-2">{t('secretary.formBuilder.settingsConditionalHint')}</p>
          <button type="button" className="text-xs hover:underline" style={{ color: 'var(--lev-teal-text)', minHeight: '44px' }}>
            {t('secretary.formBuilder.settingsAddCondition')}
          </button>
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
}
