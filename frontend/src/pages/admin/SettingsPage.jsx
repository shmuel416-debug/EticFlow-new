/**
 * EthicFlow — Institution Settings Page
 * ADMIN manages all system settings; SECRETARY can edit approval templates.
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api, { buildApiUrl } from '../../services/api'

/**
 * Setting groups — controls display order and grouping.
 * Each entry: { key, type, hint? }
 */
const GROUPS = [
  {
    groupKey: 'institutionInfo',
    icon: '🏛️',
    fields: [
      { key: 'institution_name_he',  type: 'text' },
      { key: 'institution_name_en',  type: 'text' },
      { key: 'institution_logo_url', type: 'url',   hint: 'https://...' },
      { key: 'primary_color',        type: 'color'  },
    ],
  },
  {
    groupKey: 'slaThresholds',
    icon: '⏱️',
    fields: [
      { key: 'sla_triage_days',   type: 'number', hint: '1–30' },
      { key: 'sla_review_days',   type: 'number', hint: '1–90' },
      { key: 'sla_decision_days', type: 'number', hint: '1–30' },
    ],
  },
  {
    groupKey: 'fileUpload',
    icon: '📁',
    fields: [
      { key: 'max_file_size_mb',   type: 'number', hint: 'MB' },
      { key: 'allowed_file_types', type: 'text',   hint: '.pdf,.docx,.jpg' },
    ],
  },
  {
    groupKey: 'emailSettings',
    icon: '✉️',
    fields: [
      { key: 'email_sender_name',    type: 'text'  },
      { key: 'email_sender_address', type: 'email' },
    ],
  },
]

const TEMPLATE_PLACEHOLDERS = [
  '{{applicationId}}',
  '{{researchTitle}}',
  '{{trackLabel}}',
  '{{issueDate}}',
  '{{approvedDate}}',
  '{{validUntil}}',
  '{{researcherName}}',
  '{{researcherEmail}}',
  '{{institutionName}}',
]

const DEFAULT_APPROVAL_TEMPLATES = {
  he: {
    docTitle: 'אישור ועדת אתיקה',
    subject: 'הנדון: אישור ועדת אתיקה למחקר',
    intro: 'ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן, בכפוף לתנאים הנקובים בהחלטה.',
    conditionsTitle: 'תנאי האישור:',
    conditions: [
      'המחקר יתנהל בהתאם לפרוטוקול שהוגש ואושר.',
      'כל שינוי מהותי בפרוטוקול יוגש לאישור ועדה מחדש.',
      'יש לקבל הסכמה מדעת של כל משתתף לפני תחילת המחקר.',
      'הממצאים יועברו לוועדה בתום המחקר.',
    ],
    signatureLabel: 'יו"ר ועדת האתיקה',
    legalFooter: 'מסמך רשמי זה תקף בכפוף לנהלי ועדת האתיקה וחתימות מורשות.',
  },
  en: {
    docTitle: 'Ethics Committee Approval',
    subject: 'Re: Ethics Committee Research Approval',
    intro:
      'The Ethics Committee has reviewed your application and is pleased to approve the conduct of the research described below, subject to the conditions stated in this decision.',
    conditionsTitle: 'Approval Conditions:',
    conditions: [
      'The research shall be conducted in accordance with the approved protocol.',
      'Any substantive protocol amendments require re-submission for committee approval.',
      'Informed consent must be obtained from each participant prior to commencement.',
      'Research findings shall be submitted to the committee upon completion.',
    ],
    signatureLabel: 'Chairperson, Ethics Committee',
    legalFooter: 'This official document is valid subject to ethics committee policies and authorized signatures.',
  },
}

const TRACK_LABELS = {
  FULL: { he: 'מסלול מלא', en: 'Full Review' },
  EXPEDITED: { he: 'מסלול מקוצר', en: 'Expedited Review' },
  EXEMPT: { he: 'פטור', en: 'Exempt' },
}

function templateSettingKey(lang) {
  return lang === 'en' ? 'approval_template_en' : 'approval_template_he'
}

function templateHistoryKey(lang) {
  return lang === 'en' ? 'approval_template_history_en' : 'approval_template_history_he'
}
const SIGNATURE_SETTING_KEY = 'approval_chairman_signature'

function parseTemplateValue(value, lang) {
  const fallback = DEFAULT_APPROVAL_TEMPLATES[lang]
  if (!value) return fallback
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return {
      ...fallback,
      ...(parsed || {}),
      conditions: Array.isArray(parsed?.conditions) && parsed.conditions.length > 0
        ? parsed.conditions.slice(0, 8)
        : fallback.conditions,
    }
  } catch {
    return fallback
  }
}

function parseTemplateHistoryValue(value, lang) {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id || ''),
        editedAt: String(item.editedAt || ''),
        editedByRole: String(item.editedByRole || ''),
        template: parseTemplateValue(item.template, lang),
      }))
      .slice(0, 20)
  } catch {
    return []
  }
}

function buildPreviewContext(lang) {
  if (lang === 'en') {
    return {
      applicationId: 'APP-2026-0017',
      researchTitle: 'AI Assisted Diagnostic Study',
      trackLabel: 'Full Review',
      issueDate: '21 April 2026',
      approvedDate: '18 April 2026',
      validUntil: '18 April 2027',
      researcherName: 'Dr. Maya Levi',
      researcherEmail: 'maya.levi@example.org',
      institutionName: 'Academic Institution',
    }
  }
  return {
    applicationId: 'APP-2026-0017',
    researchTitle: 'מחקר אבחון בסיוע בינה מלאכותית',
    trackLabel: 'מסלול מלא',
    issueDate: '21/04/2026',
    approvedDate: '18/04/2026',
    validUntil: '18/04/2027',
    researcherName: 'ד"ר מאיה לוי',
    researcherEmail: 'maya.levi@example.org',
    institutionName: 'המוסד האקדמי',
  }
}

function formatDateForPreview(date, lang) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', {
    day: '2-digit',
    month: lang === 'he' ? '2-digit' : 'long',
    year: 'numeric',
  })
}

function buildPreviewContextFromSubmission(lang, submission) {
  if (!submission) return buildPreviewContext(lang)
  const track = TRACK_LABELS[submission.track] || { he: submission.track || '', en: submission.track || '' }
  const approvedDate = formatDateForPreview(submission.updatedAt, lang)
  const validUntilDate = (() => {
    const d = new Date(submission.updatedAt || Date.now())
    if (Number.isNaN(d.getTime())) return ''
    d.setFullYear(d.getFullYear() + 1)
    return formatDateForPreview(d, lang)
  })()
  return {
    applicationId: submission.applicationId || '',
    researchTitle: submission.title || '',
    trackLabel: lang === 'he' ? track.he : track.en,
    issueDate: formatDateForPreview(new Date(), lang),
    approvedDate,
    validUntil: validUntilDate,
    researcherName: submission.author?.fullName || '',
    researcherEmail: submission.author?.email || '',
    institutionName: lang === 'he' ? 'המוסד האקדמי' : 'Academic Institution',
  }
}

function renderTemplatePreviewText(text, context) {
  return String(text ?? '').replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, tokenName) => context[tokenName] ?? '')
}

/**
 * Renders a single settings group card with its fields.
 * @param {{
 *   group: object,
 *   values: Record<string,string>,
 *   onSave: (groupKey: string, patch: Record<string,string>) => Promise<void>
 * }} props
 */
function SettingsGroup({ group, values, onSave }) {
  const { t } = useTranslation()

  // Local draft state — initialised from current values
  const [draft,   setDraft]   = useState({})
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)  // { type: 'ok'|'err', msg: string }

  // Sync draft when parent values change (e.g. after load)
  useEffect(() => {
    const initial = {}
    group.fields.forEach(f => { initial[f.key] = values[f.key] ?? '' })
    setDraft(initial)
  }, [values, group.fields])

  /** Returns true if any draft value differs from the saved value. */
  const isDirty = group.fields.some(f => (draft[f.key] ?? '') !== (values[f.key] ?? ''))

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      await onSave(group.groupKey, draft)
      setToast({ type: 'ok', msg: t('settings.saveSuccess') })
    } catch {
      setToast({ type: 'err', msg: t('settings.saveError') })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  function handleChange(key, val) {
    setDraft(prev => ({ ...prev, [key]: val }))
  }

  return (
    <section
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      aria-labelledby={`group-${group.groupKey}`}
    >
      {/* Group header */}
      <div className="px-5 py-4 border-b flex items-center gap-3">
        <span aria-hidden="true" className="text-xl">{group.icon}</span>
        <h2
          id={`group-${group.groupKey}`}
          className="text-sm font-bold"
          style={{ color: 'var(--lev-navy)' }}
        >
          {t(`settings.${group.groupKey}`)}
        </h2>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-5">
        {group.fields.map(field => {
          const inputId = `setting-${field.key}`
          return (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 md:items-center">
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-700"
              >
                {t(`settings.${field.key}`)}
              </label>

              <div className="md:col-span-2 flex items-center gap-3">
                {field.type === 'color' ? (
                  /* Colour picker + hex text input side by side */
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      id={inputId}
                      type="color"
                      value={draft[field.key] || '#1E2A72'}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="h-10 w-10 rounded border border-gray-200 cursor-pointer p-0.5"
                      aria-label={t(`settings.${field.key}`)}
                    />
                    <input
                      type="text"
                      value={draft[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder="#1E2A72"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 font-mono"
                      style={{ minHeight: '40px', '--tw-ring-color': 'var(--lev-navy)' }}
                      aria-label={`${t(`settings.${field.key}`)} (hex)`}
                    />
                  </div>
                ) : (
                  <input
                    id={inputId}
                    type={field.type}
                    value={draft[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.hint ?? ''}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
                    style={{ minHeight: '40px', '--tw-ring-color': 'var(--lev-navy)' }}
                    min={field.type === 'number' ? 1 : undefined}
                    aria-label={t(`settings.${field.key}`)}
                  />
                )}

                {field.hint && field.type !== 'color' && (
                  <span className="text-xs text-gray-400 shrink-0">{field.hint}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: toast + save button */}
      <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between gap-3">
        <div aria-live="polite" aria-atomic="true">
          {toast && (
            <p className={`text-xs font-semibold ${toast.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {toast.type === 'ok' ? '✓ ' : '✗ '}{toast.msg}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          aria-busy={saving}
          className="text-sm font-bold text-white px-5 py-2 rounded-lg disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--lev-navy)', minHeight: '40px' }}
          aria-label={saving ? t('common.saving') : t('settings.save')}
        >
          {saving ? '…' : t('settings.save')}
        </button>
      </div>
    </section>
  )
}

function ApprovalTemplateEditor({
  values,
  onSave,
  previewSubmissions,
  previewSubmission,
  previewSubmissionId,
  onPreviewSubmissionChange,
  previewLoading,
}) {
  const { t } = useTranslation()
  const [lang, setLang] = useState('he')
  const [previewSource, setPreviewSource] = useState('sample')
  const [draft, setDraft] = useState(DEFAULT_APPROVAL_TEMPLATES.he)
  const [signatureDataUrl, setSignatureDataUrl] = useState(values[SIGNATURE_SETTING_KEY] || '')
  const [saving, setSaving] = useState(false)
  const [previewingPdf, setPreviewingPdf] = useState(false)
  const [toast, setToast] = useState(null)

  const savedTemplate = useMemo(
    () => parseTemplateValue(values[templateSettingKey(lang)], lang),
    [values, lang]
  )
  const history = useMemo(
    () => parseTemplateHistoryValue(values[templateHistoryKey(lang)], lang),
    [values, lang]
  )
  const previewContext = useMemo(() => {
    if (previewSource === 'real' && previewSubmission) {
      return buildPreviewContextFromSubmission(lang, previewSubmission)
    }
    return buildPreviewContext(lang)
  }, [lang, previewSource, previewSubmission])

  useEffect(() => {
    setDraft(savedTemplate)
  }, [savedTemplate])
  useEffect(() => {
    setSignatureDataUrl(values[SIGNATURE_SETTING_KEY] || '')
  }, [values])

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedTemplate)
    || signatureDataUrl !== (values[SIGNATURE_SETTING_KEY] || '')

  function updateField(field, nextValue) {
    setDraft((prev) => ({ ...prev, [field]: nextValue }))
  }

  function updateCondition(index, nextValue) {
    setDraft((prev) => ({
      ...prev,
      conditions: prev.conditions.map((item, i) => (i === index ? nextValue : item)),
    }))
  }

  function addCondition() {
    if (draft.conditions.length >= 8) return
    setDraft((prev) => ({ ...prev, conditions: [...prev.conditions, ''] }))
  }

  function removeCondition(index) {
    if (draft.conditions.length <= 1) return
    setDraft((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_item, i) => i !== index),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)
    try {
      await onSave(lang, draft, signatureDataUrl)
      setToast({ type: 'ok', msg: t('settings.saveSuccess') })
    } catch {
      setToast({ type: 'err', msg: t('settings.saveError') })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  async function handlePreviewPdf() {
    const selectedSubmissionId = previewSubmissionId || previewSubmissions[0]?.id || ''
    if (!selectedSubmissionId) {
      setToast({ type: 'err', msg: t('settings.template.noApprovedSubmissions') })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setPreviewingPdf(true)
    setToast(null)
    try {
      const res = await api.post(
        '/settings/approval-template/preview',
        { submissionId: selectedSubmissionId, lang, template: draft },
        { responseType: 'blob' }
      )
      const pdfBlob = new Blob([res.data], { type: 'application/pdf' })
      const blobUrl = URL.createObjectURL(pdfBlob)
      const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      if (!previewWindow) {
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `approval-template-preview-${lang}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch {
      setToast({ type: 'err', msg: t('settings.template.previewPdfError') })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setPreviewingPdf(false)
    }
  }

  function resetToDefault() {
    setDraft(DEFAULT_APPROVAL_TEMPLATES[lang])
  }

  function clearSignature() {
    setSignatureDataUrl('')
  }

  function handleSignatureFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      setToast({ type: 'err', msg: t('settings.template.signatureTypeError') })
      setTimeout(() => setToast(null), 3000)
      return
    }
    if (file.size > 1_500_000) {
      setToast({ type: 'err', msg: t('settings.template.signatureSizeError') })
      setTimeout(() => setToast(null), 3000)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setSignatureDataUrl(result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="bg-white rounded-xl border shadow-sm overflow-hidden" aria-labelledby="approval-template-title">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-2">
        <h2 id="approval-template-title" className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('settings.approvalTemplate')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang('he')}
            className={`px-3 py-1.5 text-xs rounded-md border ${lang === 'he' ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'}`}
          >
            {t('settings.template.he')}
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 text-xs rounded-md border ${lang === 'en' ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'}`}
          >
            {t('settings.template.en')}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-xs text-gray-600">{t('settings.template.description')}</p>
        <div className="text-xs text-gray-500">
          <span className="font-semibold">{t('settings.template.placeholders')}</span>
          <div className="mt-2 flex flex-wrap gap-1">
            {TEMPLATE_PLACEHOLDERS.map((token) => (
              <code key={token} className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">{token}</code>
            ))}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <p className="text-xs font-semibold text-gray-700">{t('settings.template.previewSource')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreviewSource('sample')}
              className={`px-3 py-1.5 text-xs rounded-md border ${previewSource === 'sample' ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'}`}
            >
              {t('settings.template.previewSample')}
            </button>
            <button
              type="button"
              onClick={() => setPreviewSource('real')}
              className={`px-3 py-1.5 text-xs rounded-md border ${previewSource === 'real' ? 'bg-sky-100 border-sky-300' : 'bg-white border-gray-200'}`}
              disabled={previewSubmissions.length === 0}
            >
              {t('settings.template.previewReal')}
            </button>
          </div>
          {previewSource === 'real' && (
            <div className="space-y-2">
              <select
                value={previewSubmissionId}
                onChange={(e) => onPreviewSubmissionChange(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'var(--lev-navy)' }}
              >
                {previewSubmissions.length === 0 && (
                  <option value="">{t('settings.template.noApprovedSubmissions')}</option>
                )}
                {previewSubmissions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {`${sub.applicationId} — ${sub.title}`}
                  </option>
                ))}
              </select>
              {previewLoading && <p className="text-xs text-gray-500">{t('common.loading')}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.docTitle')}</label>
          <input
            type="text"
            value={draft.docTitle}
            onChange={(e) => updateField('docTitle', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.subject')}</label>
          <input
            type="text"
            value={draft.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.intro')}</label>
          <textarea
            rows={3}
            value={draft.intro}
            onChange={(e) => updateField('intro', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.conditionsTitle')}</label>
          <input
            type="text"
            value={draft.conditionsTitle}
            onChange={(e) => updateField('conditionsTitle', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.conditions')}</label>
          <div className="space-y-2">
            {draft.conditions.map((condition, index) => (
              <div key={`${lang}-cond-${index}`} className="flex items-start gap-2">
                <textarea
                  rows={2}
                  value={condition}
                  onChange={(e) => updateCondition(index, e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
                  style={{ '--tw-ring-color': 'var(--lev-navy)' }}
                />
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  disabled={draft.conditions.length <= 1}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 disabled:opacity-40"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCondition}
              disabled={draft.conditions.length >= 8}
              className="text-xs border border-gray-300 rounded-md px-3 py-1.5 disabled:opacity-40"
            >
              {t('settings.template.addCondition')}
            </button>
          </div>

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.signatureLabel')}</label>
          <input
            type="text"
            value={draft.signatureLabel}
            onChange={(e) => updateField('signatureLabel', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.templateFields.legalFooter')}</label>
          <textarea
            rows={2}
            value={draft.legalFooter}
            onChange={(e) => updateField('legalFooter', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2"
            style={{ '--tw-ring-color': 'var(--lev-navy)' }}
          />

          <label className="text-xs font-semibold text-gray-700">{t('settings.template.signatureUpload')}</label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignatureFileChange}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            />
            {signatureDataUrl && (
              <div className="border border-gray-200 rounded-md p-2 bg-white">
                <img
                  src={signatureDataUrl}
                  alt={t('settings.template.signaturePreviewAlt')}
                  className="max-h-16 object-contain"
                />
                <button
                  type="button"
                  onClick={clearSignature}
                  className="mt-2 text-xs border border-gray-300 rounded px-2 py-1"
                >
                  {t('settings.template.clearSignature')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg bg-slate-50 p-4" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <h3 className="text-xs font-bold mb-2 text-slate-700">{t('settings.template.previewTitle')}</h3>
          <p className="text-[11px] text-slate-500 mb-3">{t('settings.template.previewNote')}</p>
          <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
            <p className="text-[15px] font-bold text-slate-800">
              {renderTemplatePreviewText(draft.docTitle, previewContext)}
            </p>
            <p className="text-[12px] font-semibold text-slate-700">
              {renderTemplatePreviewText(draft.subject, previewContext)}
            </p>
            <p className="text-[12px] text-slate-700 whitespace-pre-wrap">
              {renderTemplatePreviewText(draft.intro, previewContext)}
            </p>
            <p className="text-[12px] font-semibold text-slate-700">
              {renderTemplatePreviewText(draft.conditionsTitle, previewContext)}
            </p>
            <ul className="list-disc list-inside text-[12px] text-slate-700 space-y-1">
              {draft.conditions.map((line, idx) => (
                <li key={`preview-cond-${idx}`}>
                  {renderTemplatePreviewText(line, previewContext)}
                </li>
              ))}
            </ul>
            <p className="text-[12px] font-semibold text-slate-700 pt-1">
              {renderTemplatePreviewText(draft.signatureLabel, previewContext)}
            </p>
            {signatureDataUrl && (
              <img
                src={signatureDataUrl}
                alt={t('settings.template.signaturePreviewAlt')}
                className="max-h-16 object-contain"
              />
            )}
            <p className="text-[11px] text-slate-500 border-t border-slate-200 pt-2">
              {renderTemplatePreviewText(draft.legalFooter, previewContext)}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
          <p className="text-xs font-semibold text-gray-700">{t('settings.template.historyTitle')}</p>
          {history.length === 0 && (
            <p className="text-xs text-gray-500">{t('settings.template.noHistory')}</p>
          )}
          {history.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-auto">
              {history.map((entry, idx) => (
                <div key={entry.id || `history-${idx}`} className="flex items-center justify-between gap-2 border border-gray-200 rounded-md p-2 bg-white">
                  <div className="text-xs text-gray-600">
                    <div>{formatDateForPreview(entry.editedAt || Date.now(), lang)}</div>
                    <div>{entry.editedByRole || 'UNKNOWN'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft(entry.template)}
                    className="text-xs border border-gray-300 rounded-md px-3 py-1.5"
                  >
                    {t('settings.template.restoreVersion')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div aria-live="polite" aria-atomic="true">
          {toast && (
            <p className={`text-xs font-semibold ${toast.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {toast.type === 'ok' ? '✓ ' : '✗ '}
              {toast.msg}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            disabled={previewingPdf}
            className="text-sm font-semibold border border-gray-300 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {previewingPdf ? t('common.loading') : t('settings.template.previewPdf')}
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            className="text-sm font-semibold border border-gray-300 px-4 py-2 rounded-lg"
          >
            {t('settings.template.resetDefault')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="text-sm font-bold text-white px-5 py-2 rounded-lg disabled:opacity-40"
            style={{ background: 'var(--lev-navy)' }}
          >
            {saving ? '…' : t('settings.save')}
          </button>
        </div>
      </div>
    </section>
  )
}

export default function SettingsPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [values,  setValues]  = useState({})   // keyed map: { key → value }
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [previewSubmissions, setPreviewSubmissions] = useState([])
  const [previewSubmissionId, setPreviewSubmissionId] = useState('')
  const [previewSubmission, setPreviewSubmission] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [calendarStatus, setCalendarStatus] = useState({
    connected: false,
    provider: 'NONE',
    syncEnabled: false,
    email: null,
    tokenExpiry: null,
    stats: { pending: 0, failed: 0, synced: 0 },
    lastSyncAt: null,
  })
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [calendarMessage, setCalendarMessage] = useState('')

  const isAdmin = user?.role === 'ADMIN'
  const canEditTemplate = user?.role === 'ADMIN' || user?.role === 'SECRETARY'
  const canUseCalendarSettings = ['SECRETARY', 'CHAIRMAN', 'REVIEWER', 'ADMIN'].includes(user?.role)

  // ── Fetch all settings (ADMIN + SECRETARY) ─────────

  useEffect(() => {
    if (!canEditTemplate) return
    async function fetchSettings() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/settings')
        const map = {}
        res.data.data.forEach(s => { map[s.key] = s.value })
        setValues(map)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [canEditTemplate])

  useEffect(() => {
    if (!canEditTemplate) return
    async function fetchPreviewSubmissions() {
      try {
        const res = await api.get('/submissions', { params: { statuses: 'APPROVED', limit: 50 } })
        const list = Array.isArray(res.data?.data) ? res.data.data : []
        setPreviewSubmissions(list)
        setPreviewSubmissionId((prev) => prev || list[0]?.id || '')
      } catch {
        setPreviewSubmissions([])
      }
    }
    fetchPreviewSubmissions()
  }, [canEditTemplate])

  useEffect(() => {
    if (!previewSubmissionId) {
      setPreviewSubmission(null)
      return
    }
    async function fetchPreviewSubmissionById() {
      setPreviewLoading(true)
      try {
        const res = await api.get(`/submissions/${previewSubmissionId}`)
        setPreviewSubmission(res.data?.submission ?? null)
      } catch {
        setPreviewSubmission(null)
      } finally {
        setPreviewLoading(false)
      }
    }
    fetchPreviewSubmissionById()
  }, [previewSubmissionId])

  useEffect(() => {
    if (!canUseCalendarSettings) return
    async function fetchCalendarStatus() {
      setCalendarLoading(true)
      try {
        const res = await api.get('/calendar/status')
        setCalendarStatus(res.data?.data || {
          connected: false,
          provider: 'NONE',
          syncEnabled: false,
          email: null,
          tokenExpiry: null,
          stats: { pending: 0, failed: 0, synced: 0 },
          lastSyncAt: null,
        })
      } catch {
        setCalendarMessage(t('settings.calendar.loadError'))
      } finally {
        setCalendarLoading(false)
      }
    }
    fetchCalendarStatus()
  }, [canUseCalendarSettings, t])

  useEffect(() => {
    if (!canUseCalendarSettings) return
    const params = new URLSearchParams(window.location.search)
    const state = params.get('calendar')
    if (!state) return
    if (state === 'connected') {
      setCalendarMessage(t('settings.calendar.connectedSuccess'))
    } else if (state === 'cancelled') {
      setCalendarMessage(t('settings.calendar.connectCancelled'))
    } else {
      setCalendarMessage(t('settings.calendar.connectFailed'))
    }
    params.delete('calendar')
    params.delete('provider')
    params.delete('reason')
    const nextQuery = params.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [canUseCalendarSettings, t])

  // ── Save a group — PUT each changed key ──────

  /**
   * Saves all fields in a group that have changed vs the current saved values.
   * @param {string} _groupKey - unused, kept for symmetry
   * @param {Record<string,string>} draft - all field values for the group
   */
  async function handleGroupSave(_groupKey, draft) {
    const updates = Object.entries(draft).filter(
      ([k, v]) => v !== (values[k] ?? '')
    )
    await Promise.all(
      updates.map(([key, value]) => api.put(`/settings/${key}`, { value }))
    )
    // Merge saved values into local state
    setValues(prev => ({ ...prev, ...Object.fromEntries(updates) }))
  }

  async function handleTemplateSave(lang, draftTemplate, signatureDraft) {
    const key = templateSettingKey(lang)
    const updates = [
      api.put(`/settings/${key}`, { value: draftTemplate }),
      api.put(`/settings/${SIGNATURE_SETTING_KEY}`, { value: signatureDraft || '' }),
    ]
    await Promise.all(updates)
    setValues((prev) => ({
      ...prev,
      [key]: JSON.stringify(draftTemplate),
      [SIGNATURE_SETTING_KEY]: signatureDraft || '',
    }))
  }

  async function refreshCalendarStatus() {
    if (!canUseCalendarSettings) return
    const res = await api.get('/calendar/status')
    setCalendarStatus(res.data?.data || {
      connected: false,
      provider: 'NONE',
      syncEnabled: false,
      email: null,
      tokenExpiry: null,
      stats: { pending: 0, failed: 0, synced: 0 },
      lastSyncAt: null,
    })
  }

  function handleConnect(provider) {
    window.location.assign(buildApiUrl(`/calendar/connect/${provider}`))
  }

  async function handleDisconnect() {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      await api.delete('/calendar/disconnect')
      await refreshCalendarStatus()
      setCalendarMessage(t('settings.calendar.disconnectedSuccess'))
    } catch {
      setCalendarMessage(t('settings.calendar.disconnectError'))
    } finally {
      setCalendarBusy(false)
    }
  }

  async function handleSyncToggle(nextValue) {
    setCalendarBusy(true)
    setCalendarMessage('')
    try {
      await api.patch('/calendar/preferences', { syncEnabled: nextValue })
      await refreshCalendarStatus()
      setCalendarMessage(nextValue ? t('settings.calendar.syncEnabledSuccess') : t('settings.calendar.syncDisabledSuccess'))
    } catch {
      setCalendarMessage(t('settings.calendar.preferencesError'))
    } finally {
      setCalendarBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header band — Lev navy ── */}
      <div
        className="px-4 md:px-6 py-5"
        style={{ background: 'linear-gradient(135deg, var(--lev-navy) 0%, #2d4db5 100%)' }}
      >
        <h1 className="text-xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6">
        {loading && (
          <div className="flex justify-center py-20 text-gray-500 text-sm" role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="max-w-3xl mx-auto space-y-4">
            {canUseCalendarSettings && (
              <section className="bg-white rounded-xl border shadow-sm overflow-hidden" aria-labelledby="calendar-connection-title">
                <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
                  <h2 id="calendar-connection-title" className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                    {t('settings.calendar.title')}
                  </h2>
                  <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-50">
                    {calendarStatus.connected
                      ? t('settings.calendar.connected')
                      : t('settings.calendar.notConnected')}
                  </span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-xs text-gray-600">{t('settings.calendar.description')}</p>

                  {calendarLoading && (
                    <p className="text-sm text-gray-500">{t('common.loading')}</p>
                  )}

                  {!calendarLoading && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleConnect('google')}
                          disabled={calendarBusy}
                          className="text-sm border border-gray-300 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-50"
                        >
                          {t('settings.calendar.connectGoogle')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnect('microsoft')}
                          disabled={calendarBusy}
                          className="text-sm border border-gray-300 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-50"
                        >
                          {t('settings.calendar.connectMicrosoft')}
                        </button>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold">{t('settings.calendar.activeProvider')}:</span>{' '}
                          {calendarStatus.provider === 'NONE' ? t('settings.calendar.none') : calendarStatus.provider}
                        </p>
                        <p>
                          <span className="font-semibold">{t('settings.calendar.accountEmail')}:</span>{' '}
                          {calendarStatus.email || t('settings.calendar.noAccount')}
                        </p>
                        <p>
                          <span className="font-semibold">{t('settings.calendar.lastSyncAt')}:</span>{' '}
                          {calendarStatus.lastSyncAt ? new Date(calendarStatus.lastSyncAt).toLocaleString() : t('settings.calendar.noSyncYet')}
                        </p>
                      </div>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(calendarStatus.syncEnabled)}
                          onChange={(e) => handleSyncToggle(e.target.checked)}
                          disabled={!calendarStatus.connected || calendarBusy}
                          className="accent-blue-600 w-4 h-4"
                        />
                        <span>{t('settings.calendar.enablePersonalSync')}</span>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleDisconnect}
                          disabled={!calendarStatus.connected || calendarBusy}
                          className="text-sm border border-red-300 text-red-700 rounded-lg px-4 py-2 min-h-[44px] disabled:opacity-40"
                        >
                          {t('settings.calendar.disconnect')}
                        </button>
                      </div>
                    </>
                  )}

                  {calendarMessage && (
                    <p className="text-xs font-semibold text-blue-700" aria-live="polite">{calendarMessage}</p>
                  )}
                </div>
              </section>
            )}

            {isAdmin && GROUPS.map(group => (
              <SettingsGroup
                key={group.groupKey}
                group={group}
                values={values}
                onSave={handleGroupSave}
              />
            ))}

            {canEditTemplate && (
              <ApprovalTemplateEditor
                values={values}
                onSave={handleTemplateSave}
                previewSubmissions={previewSubmissions}
                previewSubmission={previewSubmission}
                previewSubmissionId={previewSubmissionId}
                onPreviewSubmissionChange={setPreviewSubmissionId}
                previewLoading={previewLoading}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
