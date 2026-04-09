/**
 * EthicFlow — CanvasField
 * A single field card on the Form Builder canvas.
 * Sortable via @dnd-kit/sortable. Click → select → open settings.
 * @module components/formBuilder/CanvasField
 */

import { useTranslation }             from 'react-i18next'
import { useSortable }                from '@dnd-kit/sortable'
import { CSS }                        from '@dnd-kit/utilities'
import { FIELD_TYPE_COLOR }           from './fieldTypes'

/**
 * @param {{
 *   field:      object,
 *   isSelected: boolean,
 *   onSelect:   (id: string) => void,
 *   onRemove:   (id: string) => void,
 *   onDuplicate:(id: string) => void,
 * }} props
 */
export default function CanvasField({ field, isSelected, onSelect, onRemove, onDuplicate }) {
  const { t } = useTranslation()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : 'auto',
  }

  const badgeColor  = FIELD_TYPE_COLOR[field.type] ?? 'var(--lev-navy)'
  const typeLabel   = t(`secretary.fieldTypes.${field.type}`)
  const displayLabel = field.labelHe || field.labelEn || typeLabel

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field.id)}
      role="button"
      tabIndex={0}
      aria-label={`${t('secretary.formBuilder.title')}: ${displayLabel} — ${t('secretary.formBuilder.tabSettings')}`}
      aria-pressed={isSelected}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(field.id)}
      className={[
        'rounded-xl border-[1.5px] p-3 bg-white cursor-pointer transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lev-navy)]',
        isSelected
          ? 'border-[var(--lev-navy)] shadow-[0_0_0_3px_rgba(30,42,114,0.12)]'
          : 'border-gray-200 hover:border-blue-300',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <span
            {...attributes}
            {...listeners}
            className="text-gray-300 cursor-grab active:cursor-grabbing text-sm select-none"
            aria-hidden="true"
          >
            ⠿⠿
          </span>

          {/* Type badge */}
          <span
            className="text-white text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: badgeColor }}
            aria-hidden="true"
          >
            {typeLabel}
          </span>

          {field.required && (
            <span className="text-red-500 text-xs font-semibold" aria-label={t('secretary.formBuilder.fieldRequired')}>
              {t('secretary.formBuilder.fieldRequired')}
            </span>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-1"
          role="group"
          aria-label={t('secretary.formBuilder.fieldActionsAriaLabel', { label: displayLabel })}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onDuplicate(field.id)}
            aria-label={t('secretary.formBuilder.fieldDuplicate')}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            style={{ minWidth: '32px', minHeight: '32px' }}
          >⧉</button>
          <button
            type="button"
            onClick={() => onRemove(field.id)}
            aria-label={t('secretary.formBuilder.fieldDelete')}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            style={{ minWidth: '32px', minHeight: '32px' }}
          >✕</button>
        </div>
      </div>

      {/* Label display */}
      <p className="text-sm font-semibold" style={{ color: '#374151' }}>
        {field.labelHe || <span className="text-gray-300 italic">{typeLabel}</span>}
        {field.labelEn && (
          <span className="text-xs font-normal text-gray-400 ms-2">
            / {field.labelEn}
          </span>
        )}
      </p>
    </div>
  )
}
