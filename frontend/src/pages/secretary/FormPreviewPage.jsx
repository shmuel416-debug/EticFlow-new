/**
 * EthicFlow — FormPreviewPage
 * Standalone form preview page for /secretary/forms/:id/preview.
 * Loads form from API and renders it via FormPreview component.
 * Page shell uses the design system; FormPreview child is untouched.
 * IS 5568 / WCAG 2.2 AA. Lev color palette only.
 * @module pages/secretary/FormPreviewPage
 */

import { useState, useEffect }      from 'react'
import { useParams, useNavigate }   from 'react-router-dom'
import { useTranslation }           from 'react-i18next'
import { AlertTriangle }            from 'lucide-react'
import api          from '../../services/api'
import FormPreview  from '../../components/formBuilder/FormPreview'
import { Button, PageHeader } from '../../components/ui'

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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" role="alert">
        <AlertTriangle
          size={40}
          strokeWidth={1.5}
          aria-hidden="true"
          focusable="false"
          style={{ color: 'var(--status-warning)' }}
        />
        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
          {error || t('errors.NOT_FOUND')}
        </p>
        <div className="mt-4">
          <Button variant="primary" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  const fields = form.schemaJson?.fields ?? []

  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Skip link — IS 5568 */}
      <a
        href="#preview-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white focus:shadow-lg"
        style={{ background: 'var(--lev-navy)' }}
      >
        {t('common.skipToMain')}
      </a>

      <div
        className="bg-white px-4 md:px-6 pt-4 md:pt-5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <PageHeader
          title={form.name}
          subtitle={t('secretary.formPreview.openPreview', 'תצוגה מקדימה של טופס')}
          backTo={`/secretary/forms/${id}`}
        />
      </div>

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
