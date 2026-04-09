/**
 * EthicFlow — FormPreview
 * Full form rendered in preview mode — as a researcher would see it.
 * Shared between FormBuilderPage (live preview) and FormPreviewPage (standalone).
 * Lev color palette only. IS 5568 / WCAG 2.1 AA.
 * @module components/formBuilder/FormPreview
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormFieldPreview from './FormFieldPreview'

/**
 * Language toggle bar.
 * @param {{ lang: 'he'|'en', onChange: (l: 'he'|'en') => void }} props
 */
function LangToggle({ lang, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-1" role="group" aria-label={t('secretary.formBuilder.previewLanguage')}>
      {(['he', 'en']).map(l => (
        <button key={l} type="button"
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className="px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors"
          style={{
            background:  lang === l ? 'var(--lev-navy)' : 'transparent',
            color:       lang === l ? '#fff' : '#6b7280',
            border:      lang === l ? 'none' : '1px solid #e5e7eb',
            minHeight:   '36px',
          }}>
          {l === 'he' ? 'עב' : 'EN'}
        </button>
      ))}
    </div>
  )
}

/**
 * Renders a complete form in preview mode.
 * @param {{
 *   formName:    string,
 *   formNameEn?: string,
 *   fields:      object[],
 *   initialLang?: 'he'|'en',
 *   showLangToggle?: boolean,
 * }} props
 */
export default function FormPreview({ formName, formNameEn, fields, initialLang = 'he', showLangToggle = true }) {
  const { t } = useTranslation()
  const [lang, setLang] = useState(initialLang)

  const displayName = (lang === 'en' && formNameEn) ? formNameEn : (formName || t('secretary.formBuilder.title'))

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">

      {/* Preview header bar */}
      <div className="bg-white border-b px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ background: 'var(--lev-teal-text)' }}
            aria-label={t('secretary.formPreview.previewBadgeLabel')}>
            {t('secretary.formPreview.previewBadge')}
          </span>
          <span className="text-xs" style={{ color: 'var(--lev-teal-text)' }}>
            {t('secretary.formPreview.previewNote')}
          </span>
        </div>
        {showLangToggle && <LangToggle lang={lang} onChange={setLang} />}
      </div>

      {/* Form card */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {/* Form title */}
          <div className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--lev-teal)' }}>
            <h1 className="text-lg font-bold" style={{ color: 'var(--lev-navy)' }}>
              {displayName}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--lev-teal-text)' }}>
              {t('secretary.formBuilder.requiredNote')}
            </p>
          </div>

          {/* Empty state */}
          {fields.length === 0 && (
            <div className="text-center py-12">
              <p className="text-3xl mb-3" aria-hidden="true">📋</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
                {t('secretary.formPreview.emptyTitle')}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--lev-teal-text)' }}>
                {t('secretary.formPreview.emptyHint')}
              </p>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-6">
            {fields.map(field => (
              <FormFieldPreview key={field.id} field={field} previewLang={lang} />
            ))}
          </div>

          {/* Submit button (decorative in preview) */}
          {fields.length > 0 && (
            <div className="mt-8 pt-4 border-t border-gray-100">
              <button type="button" disabled
                aria-disabled="true"
                className="w-full py-3 text-sm font-semibold text-white rounded-xl opacity-60 cursor-not-allowed"
                style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
                {t('secretary.formPreview.submitButton')}
              </button>
              <p className="text-center text-xs mt-2" style={{ color: 'var(--lev-teal-text)' }}>
                {t('secretary.formPreview.submitDisabledNote')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
