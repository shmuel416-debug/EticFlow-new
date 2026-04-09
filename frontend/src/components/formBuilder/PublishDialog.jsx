/**
 * EthicFlow — PublishDialog
 * Modal confirmation before publishing a form (locks it permanently).
 * role="alertdialog" — IS 5568 / WCAG 2.1 AA compliant.
 * @module components/formBuilder/PublishDialog
 */

import { useEffect, useRef } from 'react'
import { useTranslation }     from 'react-i18next'

/**
 * @param {{
 *   isOpen:     boolean,
 *   onConfirm:  () => void,
 *   onClose:    () => void,
 * }} props
 */
export default function PublishDialog({ isOpen, onConfirm, onClose }) {
  const { t }       = useTranslation()
  const confirmRef  = useRef(null)

  /* Trap focus: move to confirm button when dialog opens */
  useEffect(() => {
    if (isOpen) confirmRef.current?.focus()
  }, [isOpen])

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-dialog-title"
        aria-describedby="publish-dialog-body"
        className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <h2 id="publish-dialog-title" className="text-base font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
          🚀 {t('secretary.formBuilder.publishConfirmTitle')}
        </h2>
        <p id="publish-dialog-body" className="text-sm text-gray-600 mb-5">
          {t('secretary.formBuilder.publishConfirmBody')}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            style={{ minHeight: '44px' }}
          >
            {t('common.cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm text-white rounded-xl font-semibold hover:opacity-90"
            style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
          >
            {t('secretary.formBuilder.publishConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
