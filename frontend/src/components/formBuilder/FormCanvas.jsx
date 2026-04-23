/**
 * EthicFlow — FormCanvas
 * Sortable list of canvas fields + drop zone hint.
 * Wrapped in SortableContext for within-canvas drag-to-reorder.
 * @module components/formBuilder/FormCanvas
 */

import { useTranslation }                          from 'react-i18next'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import CanvasField                                 from './CanvasField'

/**
 * @param {{
 *   fields:               object[],
 *   selectedId:           string | null,
 *   formName:             string,
 *   previewLang:          'he' | 'en',
 *   onSelect:             (id: string) => void,
 *   onRemove:             (id: string) => void,
 *   onDuplicate:          (id: string) => void,
 *   onPreviewLangChange:  (lang: 'he' | 'en') => void,
 * }} props
 */
export default function FormCanvas({ fields, selectedId, formName, previewLang, onSelect, onRemove, onDuplicate, onPreviewLangChange }) {
  const { t } = useTranslation()

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

      {/* Sub-toolbar */}
      <div className="bg-white border-b px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold" style={{ color: 'var(--lev-navy)' }}>
            📄 {t('secretary.formBuilder.canvasHint')}
          </span>
        </div>
        {/* Language toggle for preview */}
        <div className="flex gap-1" role="group" aria-label={t('secretary.formBuilder.previewLanguage')}>
          {['he', 'en'].map(lang => (
            <button
              key={lang}
              type="button"
              aria-pressed={previewLang === lang}
              onClick={() => onPreviewLangChange?.(lang)}
              className="px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors"
              style={{
                background:  previewLang === lang ? 'var(--lev-navy)' : '',
                color:       previewLang === lang ? 'white' : '#6b7280',
                border:      previewLang === lang ? 'none' : '1px solid #e5e7eb',
                minHeight:   '36px',
              }}
            >
              {lang === 'he' ? 'עב' : 'EN'}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas scroll area */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-xl mx-auto">

          {/* Form header */}
          <div className="mb-5 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold" style={{ color: 'var(--lev-navy)' }}>
              {formName || t('secretary.formBuilder.title')}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--lev-teal-text)' }}>
              {t('secretary.formBuilder.requiredNote')}
            </p>
          </div>

          {/* Sortable field list */}
          <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mb-3">
              {fields.map(field => (
                <CanvasField
                  key={field.id}
                  field={field}
                  isSelected={field.id === selectedId}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center
              transition-colors hover:border-[var(--lev-teal)] hover:bg-[var(--lev-teal-50)]"
            role="region"
            aria-label={t('secretary.formBuilder.dropZone')}
          >
            <p className="text-sm text-gray-400">{t('secretary.formBuilder.dropZone')}</p>
            <p className="text-xs text-gray-300 mt-1">{t('secretary.formBuilder.dropZoneHint')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
