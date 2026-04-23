/**
 * EthicFlow — SubmitPage (Researcher)
 * Researcher fills and submits a dynamic form loaded from /api/forms/active.
 * Refreshed to Lev design system: PageHeader + Card primitives + Button/IconButton.
 * IS 5568 / WCAG 2.2 AA. Lev palette only via CSS vars. Mobile-first.
 * @module pages/researcher/SubmitPage
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams }                    from 'react-router-dom'
import { useTranslation }                            from 'react-i18next'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Save,
  Send,
} from 'lucide-react'
import api                                           from '../../services/api'
import FormRenderer                                  from '../../components/formRenderer/FormRenderer'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  IconButton,
  Spinner,
  Badge,
  EmptyState,
} from '../../components/ui'

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
  const remaining = required.length - filled.length

  return (
    <aside
      className="hidden md:flex flex-col gap-4 w-56 shrink-0"
      aria-label={t('submission.submit.summaryTitle')}
    >
      <Card>
        <CardHeader title={t('submission.submit.summaryTitle')} />
        <CardBody>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>
                {t('submission.submit.summaryRequired')}
              </span>
              <span className="font-bold" style={{ color: 'var(--lev-purple)' }}>
                {required.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>
                {t('submission.submit.summaryFilled')}
              </span>
              <span className="font-bold" style={{ color: 'var(--status-success)' }}>
                {filled.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>
                {t('submission.submit.summaryRemaining')}
              </span>
              <span
                className="font-bold"
                style={{
                  color:
                    remaining > 0
                      ? 'var(--status-warning)'
                      : 'var(--status-success)',
                }}
              >
                {remaining}
              </span>
            </div>
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden"
            style={{
              background: 'var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
            }}
            aria-hidden="true"
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${required.length ? (filled.length / required.length) * 100 : 0}%`,
                background: 'var(--lev-navy)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </CardBody>
      </Card>

      {hasErrors && (
        <Card>
          <CardHeader title={t('submission.submit.errorsTitle')} />
          <CardBody>
            <ul
              className="space-y-1 text-xs list-disc list-inside"
              style={{ color: 'var(--status-danger)' }}
            >
              {Object.entries(errors)
                .filter(([, v]) => v)
                .slice(0, 4)
                .map(([k]) => {
                  const field = fields.find(f => (f.id || f.key) === k)
                  return field ? <li key={k}>{field.labelHe || field.labelEn}</li> : null
                })}
            </ul>
          </CardBody>
        </Card>
      )}

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('submission.submit.summaryTip')}
      </p>
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
    <Card as="section" aria-labelledby={`section-${num}`}>
      <CardHeader>
        <h2
          id={`section-${num}`}
          className="flex items-center gap-2 text-sm font-bold"
          style={{ color: 'var(--lev-purple)' }}
        >
          <span
            className="inline-flex items-center justify-center text-xs shrink-0"
            style={{
              width: 22,
              height: 22,
              borderRadius: 'var(--radius-full)',
              background: 'var(--lev-purple)',
              color: '#fff',
            }}
            aria-hidden="true"
          >
            {num}
          </span>
          {title}
        </h2>
      </CardHeader>
      <CardBody>
        <div className="space-y-5">{children}</div>
      </CardBody>
    </Card>
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
    <div
      className="flex flex-col items-center justify-center py-20 text-center px-4"
      data-testid="submit-success-screen"
      role="status"
      aria-live="polite"
    >
      <div
        className="inline-flex items-center justify-center mb-4"
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--radius-full)',
          background: 'var(--status-success-50)',
          color: 'var(--status-success)',
        }}
      >
        <CheckCircle2 size={40} strokeWidth={1.75} aria-hidden="true" focusable="false" />
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
        {t('submission.submit.submitSuccess')}
      </h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-muted)' }}>
        {t('submission.submit.submitSuccessBody', { id: applicationId })}
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/dashboard')}
        data-testid="submit-success-dashboard"
      >
        {t('submission.submit.backToDashboard')}
      </Button>
    </div>
  )
}

/* ── Main page ───────────────────────────── */
/**
 * SubmitPage — loads active form, renders fields, posts submission.
 * @returns {JSX.Element}
 */
export default function SubmitPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { id: editId } = useParams()          // present on /submissions/:id/edit
  const lang        = i18n.language === 'en' ? 'en' : 'he'
  const isRtl       = i18n.dir() === 'rtl'
  const SubmitArrow = isRtl ? ArrowLeft : ArrowRight

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
        const { data } = await api.put(`/submissions/${targetId}`, { dataJson: values })
        applicationId = data.submission?.applicationId
      } else {
        const { data } = await api.post('/submissions', {
          formConfigId: formMeta.id,
          title:        values[fields[0]?.id || fields[0]?.key] || t('submission.submit.pageTitle'),
          dataJson:     values,
        })
        targetId      = data.submission?.id
        applicationId = data.submission?.applicationId
      }

      await api.post(`/submissions/${targetId}/submit`)
      setSuccessId(applicationId ?? '')
    } catch (err) {
      const key = `errors.${err.code}`
      setSubmitError(t(key) !== key ? t(key) : (err.message || t('errors.SERVER_ERROR')))
    } finally {
      setSubmitting(false)
    }
  }, [validate, submissionId, formMeta, fields, values, t])

  /* ── Render states ── */
  if (loading) {
    return (
      <div
        className="flex flex-1 items-center justify-center py-24 gap-3"
        role="status"
        aria-live="polite"
      >
        <Spinner size={20} label={t('common.loading')} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('common.loading')}
        </p>
      </div>
    )
  }

  if (successId) return <SuccessScreen applicationId={successId} />

  if (loadError || !formMeta) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader
          title={t('submission.submit.pageTitle')}
          backTo="/dashboard"
          backLabel={t('submission.submit.backToDashboard')}
        />
        <Card>
          <CardBody>
            <EmptyState
              icon={AlertTriangle}
              title={loadError || t('submission.submit.noActiveForm')}
              action={
                <Button
                  variant="primary"
                  onClick={() => navigate('/dashboard')}
                >
                  {t('submission.submit.backToDashboard')}
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    )
  }

  const formDisplayName = previewLang === 'en' && formMeta.nameEn ? formMeta.nameEn : formMeta.name

  const langToggle = (
    <div
      role="group"
      aria-label={t('secretary.formBuilder.previewLanguage')}
      className="flex gap-1 shrink-0"
    >
      {['he', 'en'].map(l => {
        const isActive = previewLang === l
        return (
          <button
            key={l}
            type="button"
            data-testid={`submit-lang-${l}`}
            aria-pressed={isActive}
            onClick={() => setPreviewLang(l)}
            className="text-xs font-semibold transition-colors"
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 'var(--radius-lg)',
              background: isActive ? 'var(--lev-navy)' : 'transparent',
              color: isActive ? '#fff' : 'var(--lev-navy)',
              border: `1px solid ${isActive ? 'var(--lev-navy)' : 'var(--border-default)'}`,
            }}
          >
            {l === 'he' ? 'עב' : 'EN'}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <a href="#submit-form" className="skip-link">
        {t('common.skipToMain')}
      </a>

      <PageHeader
        title={t('submission.submit.pageTitle')}
        subtitle={`${formDisplayName} · ${t('submission.submit.requiredNote')}`}
        backTo="/dashboard"
        backLabel={t('submission.submit.backToDashboard')}
        actions={langToggle}
      />

      <div className="flex gap-6">
        {/* Main column */}
        <main id="submit-form" className="flex-1 min-w-0 space-y-5">
          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start justify-between gap-3 text-sm font-medium"
              style={{
                background: 'var(--status-danger-50)',
                color: 'var(--status-danger)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 14px',
              }}
            >
              <div className="flex items-start gap-2 min-w-0">
                <AlertCircle
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <span className="min-w-0 break-words">{submitError}</span>
              </div>
              <IconButton
                icon={X}
                label={t('common.close', 'סגור')}
                onClick={() => setSubmitError('')}
              />
            </div>
          )}

          {sections.map((sectionFields, idx) => (
            <Section
              key={idx}
              num={idx + 1}
              title={
                sectionTitles[idx] ?? t('submission.submit.sectionFallback', { num: idx + 1 })
              }
            >
              <FormRenderer
                fields={sectionFields}
                values={values}
                errors={errors}
                lang={previewLang}
                onChange={handleChange}
              />
            </Section>
          ))}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={submitting || savingDraft}
              loading={savingDraft}
              leftIcon={
                draftSaved ? (
                  <CheckCircle2
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                ) : (
                  <Save
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                )
              }
              data-testid="submit-save-draft"
              style={
                draftSaved
                  ? {
                      color: 'var(--status-success)',
                      borderColor: 'var(--status-success)',
                    }
                  : undefined
              }
            >
              {draftSaved
                ? t('submission.submit.draftSaved')
                : savingDraft
                  ? t('common.loading')
                  : t('submission.submit.saveDraft')}
            </Button>

            <Button
              variant="gold"
              onClick={handleSubmit}
              disabled={submitting}
              loading={submitting}
              leftIcon={
                <Send
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                />
              }
              rightIcon={
                <SubmitArrow
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                />
              }
              data-testid="submit-final-submit"
            >
              {submitting
                ? t('submission.submit.submitting')
                : t('submission.submit.submitBtn')}
            </Button>

            {draftSaved && (
              <Badge tone="success" size="md">
                {t('submission.submit.draftSaved')}
              </Badge>
            )}
          </div>
        </main>

        {/* Summary sidebar */}
        <SummarySidebar fields={fields} values={values} errors={errors} />
      </div>
    </div>
  )
}
