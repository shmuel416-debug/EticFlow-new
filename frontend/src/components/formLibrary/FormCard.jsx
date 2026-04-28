/**
 * EthicFlow — FormCard
 * Single form card for the Form Library grid (Option B design).
 * Colored top border by status. IS 5568 / WCAG 2.1 AA. Lev palette only.
 * @module components/formLibrary/FormCard
 */

import { useTranslation } from 'react-i18next'
import { Pencil, Eye, Archive, RotateCcw, Copy } from 'lucide-react'

/** Top border color per status */
const STATUS_BORDER = {
  draft:     '#d97706',
  published: 'var(--lev-navy)',
  archived:  '#9ca3af',
}

/**
 * Status badge pill.
 * @param {{ status: 'draft'|'published'|'archived' }} props
 */
function StatusBadge({ status }) {
  const { t } = useTranslation()
  const styles = {
    draft:     { bg: '#fef9c3', color: '#92400e' },
    published: { bg: '#dcfce7', color: '#16a34a' },
    archived:  { bg: '#f3f4f6', color: '#6b7280' },
  }
  const { bg, color } = styles[status] ?? styles.draft
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
      style={{ background: bg, color }}>
      {t(`secretary.formBuilder.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
    </span>
  )
}

/**
 * Form card component — matches Option B design exactly.
 * @param {{
 *   form:        object,
 *   onEdit:      (id: string) => void,
 *   onPreview:   (id: string) => void,
 *   onArchive:   (id: string) => void,
 *   onRestore:   (id: string) => void,
 *   onDuplicate: (id: string) => void,
 * }} props
 */
export default function FormCard({ form, onEdit, onPreview, onArchive, onRestore, onDuplicate }) {
  const { t, i18n } = useTranslation()
  const isRtl      = i18n.language === 'he'
  const isArchived = form.status === 'archived'
  const isDraft    = form.status === 'draft'

  const displayName   = isRtl ? form.name : (form.nameEn || form.name)
  const secondaryName = isRtl ? form.nameEn : form.name
  const fieldCount    = form.schemaJson?.fields?.length ?? 0
  const updatedDate   = form.updatedAt
    ? new Date(form.updatedAt).toLocaleDateString(isRtl ? 'he-IL' : 'en-US')
    : '—'

  return (
    <article
      className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-opacity ${isArchived ? 'opacity-60' : ''}`}
      aria-label={`${displayName} — ${t(`secretary.formBuilder.status${form.status.charAt(0).toUpperCase() + form.status.slice(1)}`)}`}
    >
      {/* Colored top stripe */}
      <div className="h-2 shrink-0" style={{ background: STATUS_BORDER[form.status] ?? STATUS_BORDER.draft }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-snug truncate"
              style={{ color: isArchived ? '#9ca3af' : 'var(--lev-navy)' }}>
              {displayName}
            </h3>
            {secondaryName && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{secondaryName}</p>
            )}
          </div>
          <StatusBadge status={form.status} />
        </div>

        {/* Meta row */}
        <div className="flex gap-3 text-xs text-gray-400 mb-4 flex-wrap">
          <span>{t('secretary.formLibrary.cardVersion', { version: form.version ?? 1 })}</span>
          <span>·</span>
          <span>{t('secretary.formLibrary.cardFields', { count: fieldCount })}</span>
          <span>·</span>
          <span>{t('secretary.formLibrary.cardUpdated', { date: updatedDate })}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {isDraft && (
            <button type="button" onClick={() => onEdit(form.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
              aria-label={`${t('secretary.formLibrary.actionEdit')} — ${displayName}`}>
              <Pencil size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formLibrary.actionEdit')}
            </button>
          )}

          {!isArchived && (
            <button type="button" onClick={() => onPreview(form.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--lev-teal-text)', minHeight: '44px' }}
              aria-label={`${t('secretary.formLibrary.actionPreview')} — ${displayName}`}>
              <Eye size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formLibrary.actionPreview')}
            </button>
          )}

          {!isArchived && (
            <button type="button" onClick={() => onDuplicate(form.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--lev-teal-text)', minHeight: '44px' }}
              aria-label={`${t('secretary.formLibrary.actionDuplicate')} — ${displayName}`}
              data-testid={`duplicate-form-${form.id}`}>
              <Copy size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formLibrary.actionDuplicate')}
            </button>
          )}

          {!isArchived && (
            <button type="button" onClick={() => onArchive(form.id)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl border transition-colors"
              style={{ color: 'var(--status-danger)', background: 'var(--status-danger-50)', borderColor: 'var(--status-danger)', minHeight: '44px' }}
              aria-label={`${t('secretary.formLibrary.actionArchive')} — ${displayName}`}>
              <Archive size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formLibrary.actionArchive')}
            </button>
          )}

          {isArchived && (
            <button type="button" onClick={() => onRestore(form.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              style={{ color: 'var(--lev-navy)', minHeight: '44px' }}
              aria-label={`${t('secretary.formLibrary.actionRestore')} — ${displayName}`}>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              {t('secretary.formLibrary.actionRestore')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
