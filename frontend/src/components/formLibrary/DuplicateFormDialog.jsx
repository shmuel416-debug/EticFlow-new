/**
 * DuplicateFormDialog — Modal for duplicating a form
 * Asks for confirmation with options to include instructions and attachments.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Button } from '../ui'

/**
 * @param {{
 *   isOpen: boolean,
 *   form: object,
 *   onConfirm: (options: {includeInstructions: boolean, includeAttachments: boolean}) => Promise<void>,
 *   onCancel: () => void,
 *   loading: boolean,
 * }} props
 */
export default function DuplicateFormDialog({ isOpen, form, onConfirm, onCancel, loading }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const [includeInstructions, setIncludeInstructions] = useState(true)
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [error, setError] = useState('')

  const displayName = isRtl ? form?.name : (form?.nameEn || form?.name)

  const handleConfirm = async () => {
    try {
      setError('')
      await onConfirm({ includeInstructions, includeAttachments })
    } catch (err) {
      setError(err.message || t('forms.duplicate.error') || 'Failed to duplicate form')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-dialog-title"
      data-testid="duplicate-form-dialog"
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-sm w-full"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2
            id="duplicate-dialog-title"
            className="text-lg font-bold"
            style={{ color: 'var(--lev-navy)' }}
          >
            {t('forms.duplicate.title')}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t('forms.duplicate.description')}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Form name info */}
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('common.title')}: <span className="font-semibold" style={{ color: 'var(--lev-navy)' }}>{displayName}</span>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'var(--status-danger-50)', color: 'var(--status-danger)' }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeInstructions}
                onChange={(e) => setIncludeInstructions(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 mt-1 cursor-pointer"
                data-testid="duplicate-include-instructions"
              />
              <span
                className="text-sm font-medium leading-snug group-hover:opacity-75 transition-opacity"
                style={{ color: 'var(--lev-navy)' }}
              >
                {t('forms.duplicate.includeInstructions')}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 mt-1 cursor-pointer"
                data-testid="duplicate-include-attachments"
              />
              <span
                className="text-sm font-medium leading-snug group-hover:opacity-75 transition-opacity"
                style={{ color: 'var(--lev-navy)' }}
              >
                {t('forms.duplicate.includeAttachments')}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            data-testid="duplicate-cancel"
          >
            {t('forms.duplicate.cancelButton')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
            data-testid="duplicate-confirm"
          >
            {t('forms.duplicate.confirmButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
