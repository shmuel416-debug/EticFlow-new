/**
 * EthicFlow — SubmitPage (Researcher)
 * Researcher fills and submits a dynamic form loaded from /api/forms/active.
 * Design B: navy header band + numbered sections + right summary sidebar.
 * IS 5568 / WCAG 2.1 AA. Lev palette only. Mobile-first.
 * @module pages/researcher/SubmitPage
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams }                    from 'react-router-dom'
import { useTranslation }                            from 'react-i18next'
import api                                           from '../../services/api'
import FormRenderer                                  from '../../components/formRenderer/FormRenderer'

/* ── Summary sidebar ─────────────────────── */
/**
 * Right-panel: shows filled / remaining counts + tip.
 * @param {{ fields: object[], values: object, errors: object }} props
 */
function SummarySidebar({ fields, values, errors }) {
  const { t } = useTranslation()
  const required = fields.filter(f => f.required)
  const filled   = required.filter(f => {
    const v = values[f.id || f.key]
    return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0)
  })
  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <aside className="hidden md:flex flex-col gap-4 w-44 shrink-0 ps-4 border-s"
      aria-label={t('submission.submit.summaryTitle')}>
      <div className="rounded-xl p-3 border" style={{ background: '#EEF0FA', borderColor: '#c7cce8' }}>
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.submit.summaryTitle')}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('submission.submit.summaryRequired')}</span>
            <span className="font-bold" style={{ color: 'var(--lev-purple)' }}>{required.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('submission.submit.summaryFilled')}</span>
            <span className="font-bold" style={{ color: '#16a34a' }}>{filled.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('submission.submit.summaryRemaining')}</span>
            <span className="font-bold" style={{ color: required.length - filled.length > 0 ? '#d97706' : '#16a34a' }}>
              {required.length - filled.length}
            </span>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${required.length ? (filled.length / required.length) * 100 : 0}%`, background: 'var(--lev-navy)' }} />
        </div>
      </div>

      {hasErrors && (
        <div className="rounded-xl p-3 text-xs" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className="font-semibold text-red-700 mb-1">{t('submission.submit.errorsTitle')}</p>
          <ul className="space-y-0.5 text-red-600 list-disc list-inside">
            {Object.entries(errors).filter(([, v]) => v).slice(0, 4).map(([k]) => {
              const field = fields.find(f => (f.id || f.key) === k)
              return field ? <li key={k}>{field.labelHe || field.labelEn}</li> : null
            })}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">{t('submission.submit.summaryTip')}</p>
    </aside>
  )
}

/* ── Section wrapper ─────────────────────── */
/**
 * Numbered section card with purple header number.
 * @param {{ num: number, title: string, children: React.ReactNode }} props
 */
function Section({ num, title, children }) {
  return (
    <section aria-labelledby={`section-${num}`}>
      <h2 id={`section-${num}`} className="flex items-center gap-2 text-xs font-bold mb-3"
        style={{ color: 'var(--lev-purple)' }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shrink-0"
          style={{ background: 'var(--lev-purple)' }} aria-hidden="true">{num}</span>
        {title}
      </h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 space-y-5">
        {children}
      </div>
    </section>
  )
}

/* ── Success screen ──────────────────────── */
/**
 * @param {{ applicationId: string }} props
 */
function SuccessScreen({ applicationId }) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4" data-testid="submit-success-screen">
      <span className="text-5xl mb-4" aria-hidden="true">✅</span>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
        {t('submission.submit.submitSuccess')}
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-sm">
        {t('submission.submit.submitSuccessBody', { id: applicationId })}
      </p>
      <button type="button" onClick={() => navigate('/dashboard')} data-testid="submit-success-dashboard"
        className="px-6 py-3 text-sm font-semibold text-white rounded-xl hover:opacity-90"
        style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
        {t('submission.submit.backToDashboard')}
      </button>
    </div>
  )
}

/* ── Main page ───────────────────────────── */
/**
 * SubmitPage — loads active form, renders fields, posts submission.
 */
export default function SubmitPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { id: editId } = useParams()          // present on /submissions/:id/edit
  const lang        = i18n.language === 'en' ? 'en' : 'he'

  const [formMeta,    setFormMeta]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState('')
  const [values,      setValues]      = useState({})
  const [errors,      setErrors]      = useState({})
  const [submitting,   setSubmitting]   = useState(false)
  const [savingDraft,  setSavingDraft]  = useState(false)
  const [submitError,  setSubmitError]  = useState('')
  const [draftSaved,   setDraftSaved]   = useState(false)
  const [submissionId, setSubmissionId] = useState(editId ?? null)
  const [successId,    setSuccessId]    = useState('')
  const [previewLang,  setPreviewLang]  = useState(lang)

  const fields = useMemo(() => formMeta?.schemaJson?.fields ?? [], [formMeta])

  /* Load active form, then load existing submission data if editing */
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: formData } = await api.get('/forms/active')
        if (cancelled) return
        setFormMeta(formData.form ?? null)

        if (editId) {
          const { data: subData } = await api.get(`/submissions/${editId}`)
          if (!cancelled) {
            const existing = subData.submission ?? subData
            const vers     = existing.versions ?? []
            const latest   = (vers[vers.length - 1] ?? vers[0])?.dataJson ?? {}
            setValues(latest)
            setSubmissionId(editId)
          }
        }
      } catch {
        if (!cancelled) setLoadError(t('submission.submit.formLoadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [t, editId])

  const handleChange = useCallback((id, val) => {
    setValues(prev => ({ ...prev, [id]: val }))
    setErrors(prev => ({ ...prev, [id]: '' }))
  }, [])

  /** Validate required fields → returns error map */
  const validate = useCallback(() => {
    const errs = {}
    fields.forEach(f => {
      if (!f.required) return
      const fid = f.id || f.key
      const v = values[fid]
      const empty = v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0)
      if (empty) errs[fid] = t('submission.submit.fieldRequired')
    })
    return errs
  }, [fields, values, t])

  /** Split fields into 3 sections by index */
  const sections = useMemo(() => {
    const third = Math.ceil(fields.length / 3) || 1
    return [
      fields.slice(0, third),
      fields.slice(third, third * 2),
      fields.slice(third * 2),
    ].filter(s => s.length > 0)
  }, [fields])

  const sectionTitles = [
    t('submission.submit.section1Title'),
    t('submission.submit.section2Title'),
    t('submission.submit.section3Title'),
  ]

  /** Save current values as a draft (no validation). Creates or updates the submission. */
  const handleSaveDraft = useCallback(async () => {
    setSavingDraft(true)
    setSubmitError('')
    setDraftSaved(false)
    try {
      if (submissionId) {
        await api.put(`/submissions/${submissionId}`, { dataJson: values })
      } else {
        const { data } = await api.post('/submissions', {
          formConfigId: formMeta.id,
          title:        values[fields[0]?.id || fields[0]?.key] || t('submission.submit.pageTitle'),
          dataJson:     values,
        })
        setSubmissionId(data.submission?.id ?? null)
      }
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 3000)
    } catch (err) {
      const key = `errors.${err.code}`
      setSubmitError(t(key) !== key ? t(key) : (err.message || t('errors.SERVER_ERROR')))
    } finally {
      setSavingDraft(false)
    }
  }, [submissionId, formMeta, fields, values, t])

  const handleSubmit = useCallback(async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      let targetId = submissionId
      let applicationId

      if (targetId) {
        // Update the existing draft data
        const { data } = await api.put(`/submissions/${targetId}`, { dataJson: values })
        applicationId = data.submission?.applicationId
      } else {
        // Create a new draft
        const { data } = await api.post('/submissions', {
          formConfigId: formMeta.id,
          title:        values[fields[0]?.id || fields[0]?.key] || t('submission.submit.pageTitle'),
          dataJson:     values,
        })
        targetId      = data.submission?.id
        applicationId = data.submission?.applicationId
      }

      // Transition DRAFT → SUBMITTED
      await api.post(`/submissions/${targetId}/submit`)
      setSuccessId(applicationId ?? '')
    } catch (err) {
      // api.js interceptor normalises errors to { message, code, status }
      const key = `errors.${err.code}`
      setSubmitError(t(key) !== key ? t(key) : (err.message || t('errors.SERVER_ERROR')))
    } finally {
      setSubmitting(false)
    }
  }, [validate, submissionId, formMeta, fields, values, t])

  /* ── Render states ── */
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
        <p className="text-sm" style={{ color: 'var(--lev-teal-text)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  if (successId) return <SuccessScreen applicationId={successId} />

  if (loadError || !formMeta) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-3xl mb-3" aria-hidden="true">⚠️</p>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {loadError || t('submission.submit.noActiveForm')}
        </p>
        <button type="button" onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
          {t('submission.submit.backToDashboard')}
        </button>
      </div>
    )
  }

  const formDisplayName = previewLang === 'en' && formMeta.nameEn ? formMeta.nameEn : formMeta.name

  return (
    <div className="-m-4 md:-m-6 flex flex-col" style={{ minHeight: 'calc(100vh - 64px)' }}>

      {/* Skip link — IS 5568 */}
      <a href="#submit-form"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2
          focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm
          focus:font-semibold focus:text-white"
        style={{ background: 'var(--lev-navy)' }}>
        {t('common.skipToMain')}
      </a>

      {/* Navy header band */}
      <header className="px-5 py-5 shrink-0" style={{ background: 'var(--lev-navy)' }} data-testid="submit-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-white">{t('submission.submit.pageTitle')}</h1>
            <p className="text-xs text-white/70 mt-0.5">{formDisplayName} · {t('submission.submit.requiredNote')}</p>
          </div>
          {/* Language toggle */}
          <div role="group" aria-label={t('secretary.formBuilder.previewLanguage')} className="flex gap-1 shrink-0">
            {['he', 'en'].map(l => (
              <button key={l} type="button"
                data-testid={`submit-lang-${l}`}
                aria-pressed={previewLang === l}
                onClick={() => setPreviewLang(l)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{
                  background:  previewLang === l ? 'white' : 'transparent',
                  color:       previewLang === l ? 'var(--lev-navy)' : 'rgba(255,255,255,0.6)',
                  border:      previewLang === l ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  minHeight:   '36px',
                }}>
                {l === 'he' ? 'עב' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <main id="submit-form" className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* Submit error */}
          {submitError && (
            <div role="alert" aria-live="assertive"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex justify-between text-sm text-red-700">
              {submitError}
              <button onClick={() => setSubmitError('')} className="text-red-500 ms-3 font-bold" style={{ minWidth: '28px' }}>✕</button>
            </div>
          )}

          {/* Numbered sections */}
          <div className="space-y-5 max-w-xl">
            {sections.map((sectionFields, idx) => (
              <Section key={idx} num={idx + 1} title={sectionTitles[idx] ?? t('submission.submit.sectionFallback', { num: idx + 1 })}>
                <FormRenderer
                  fields={sectionFields}
                  values={values}
                  errors={errors}
                  lang={previewLang}
                  onChange={handleChange}
                />
              </Section>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6 max-w-xl">
            <button type="button" onClick={handleSaveDraft} disabled={submitting || savingDraft}
              data-testid="submit-save-draft"
              className="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              style={{ color: draftSaved ? '#16a34a' : 'var(--lev-navy)', minHeight: '44px',
                borderColor: draftSaved ? '#86efac' : '' }}>
              {draftSaved ? t('submission.submit.draftSaved') : savingDraft ? t('common.loading') : t('submission.submit.saveDraft')}
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              data-testid="submit-final-submit"
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
              {submitting ? t('submission.submit.submitting') : t('submission.submit.submitBtn')}
            </button>
          </div>
        </main>

        {/* Summary sidebar — desktop only */}
        <div className="hidden md:block p-6 shrink-0">
          <SummarySidebar fields={fields} values={values} errors={errors} />
        </div>
      </div>
    </div>
  )
}
