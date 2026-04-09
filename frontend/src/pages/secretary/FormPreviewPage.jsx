/**
 * EthicFlow — FormPreviewPage
 * Standalone form preview page for /secretary/forms/:id/preview.
 * Loads form from API and renders it via FormPreview component.
 * IS 5568 / WCAG 2.1 AA. Lev color palette only.
 * @module pages/secretary/FormPreviewPage
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import FormPreview from '../../components/formBuilder/FormPreview'

/**
 * Loads a published (or draft) form from the API and renders it in preview mode.
 */
export default function FormPreviewPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { t }      = useTranslation()

  const [form,    setForm]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadForm() {
      try {
        const { data } = await api.get(`/forms/${id}`)
        if (!cancelled) setForm(data.form)
      } catch {
        if (!cancelled) setError(t('errors.SERVER_ERROR'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadForm()
    return () => { cancelled = true }
  }, [id, t])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
        <p className="text-sm" style={{ color: 'var(--lev-teal-text)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">⚠️</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
          {error || t('errors.NOT_FOUND')}
        </p>
        <button type="button" onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  const fields = form.schemaJson?.fields ?? []

  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Skip link — IS 5568 */}
      <a href="#preview-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white focus:shadow-lg"
        style={{ background: 'var(--lev-navy)' }}>
        {t('common.skipToMain')}
      </a>

      {/* Page top bar */}
      <header className="bg-white border-b px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button type="button"
          onClick={() => navigate(`/secretary/forms/${id}`)}
          aria-label={t('secretary.formPreview.backToEditor')}
          className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--lev-navy)', minHeight: '44px' }}>
          <span aria-hidden="true" className="text-base">›</span>
          {t('secretary.formPreview.backToEditor')}
        </button>
        <span className="text-gray-300 select-none">|</span>
        <span className="text-sm font-bold truncate" style={{ color: 'var(--lev-navy)' }}>
          {form.name}
        </span>
      </header>

      {/* Preview */}
      <main id="preview-main" className="flex-1 overflow-hidden">
        <FormPreview
          formName={form.name}
          formNameEn={form.nameEn}
          fields={fields}
          showLangToggle
        />
      </main>
    </div>
  )
}
