/**
 * EthicFlow — Institution Settings Page
 * ADMIN manages all system settings; SECRETARY can edit approval templates.
 * Refactored to use design-system primitives (PageHeader, Card, Tabs,
 * FormField, Input, Textarea, Button, Badge).
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2, Timer, FolderOpen, Mail, FileCheck2, CalendarClock,
  Check, X as XIcon, Eye, RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api, { buildApiUrl } from '../../services/api'
import {
  Button, Card, CardHeader, CardBody, CardFooter,
  PageHeader, FormField, Input, Textarea, Select, Tabs, Badge,
} from '../../components/ui'

/**
 * Setting groups — controls display order and grouping.
 * Each entry: { key, type, hint? }
 */
const GROUPS = [
  {
    groupKey: 'institutionInfo',
    icon: Building2,
    fields: [
      { key: 'institution_name_he',  type: 'text' },
      { key: 'institution_name_en',  type: 'text' },
      { key: 'institution_logo_url', type: 'url',   hint: 'https://...' },
      { key: 'primary_color',        type: 'color'  },
    ],
  },
  {
    groupKey: 'slaThresholds',
    icon: Timer,
    fields: [
      { key: 'sla_triage_days',   type: 'number', hint: '1–30' },
      { key: 'sla_review_days',   type: 'number', hint: '1–90' },
      { key: 'sla_decision_days', type: 'number', hint: '1–30' },
    ],
  },
  {
    groupKey: 'fileUpload',
    icon: FolderOpen,
    fields: [
      { key: 'max_file_size_mb',   type: 'number', hint: 'MB' },
      { key: 'allowed_file_types', type: 'text',   hint: '.pdf,.docx,.jpg' },
    ],
  },
  {
    groupKey: 'emailSettings',
    icon: Mail,
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
    intro: 'ועדת האתיקה בדקה את בקשתך לאשר את ביצוע המחקר המפורט להלן, בכפוף לתנאים הנקובים בהחלטה.',
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
 * Inline status toast inside a card footer.
 * @param {{ toast: {type: 'ok'|'err', msg: string} | null }} props
 */
function InlineToast({ toast }) {
  if (!toast) return <div aria-live="polite" aria-atomic="true" />
  const ok = toast.type === 'ok'
  const Icon = ok ? Check : XIcon
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-xs font-semibold inline-flex items-center gap-1.5"
      style={{ color: ok ? 'var(--status-success)' : 'var(--status-danger)' }}
    >
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" focusable="false" />
      {toast.msg}
    </p>
  )
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
  const GroupIcon = group.icon

  const [draft,   setDraft]   = useState({})
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)

  useEffect(() => {
    const initial = {}
    group.fields.forEach(f => { initial[f.key] = values[f.key] ?? '' })
    setDraft(initial)
  }, [values, group.fields])

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
    <Card as="section" aria-labelledby={`group-${group.groupKey}`}>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <GroupIcon size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" style={{ color: 'var(--lev-navy)' }} />
            <span id={`group-${group.groupKey}`}>{t(`settings.${group.groupKey}`)}</span>
          </span>
        }
      />
      <CardBody>
        <div className="space-y-5">
          {group.fields.map(field => (
            <FormField
              key={field.key}
              label={t(`settings.${field.key}`)}
              hint={field.type !== 'color' ? field.hint : undefined}
              render={({ inputId, describedBy, invalid }) => (
                field.type === 'color' ? (
                  <div className="flex items-center gap-2">
                    <input
                      id={inputId}
                      type="color"
                      value={draft[field.key] || '#1E2A72'}
                      onChange={e => handleChange(field.key, e.target.value)}
                      aria-label={t(`settings.${field.key}`)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)',
                        padding: 2,
                        cursor: 'pointer',
                      }}
                    />
                    <Input
                      value={draft[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder="#1E2A72"
                      aria-label={`${t(`settings.${field.key}`)} (hex)`}
                      className="font-mono"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <Input
                    id={inputId}
                    type={field.type}
                    value={draft[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.hint ?? ''}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    min={field.type === 'number' ? 1 : undefined}
                  />
                )
              )}
            />
          ))}
        </div>
      </CardBody>
      <CardFooter>
        <InlineToast toast={toast} />
        <Button
          variant="gold"
          onClick={handleSave}
          disabled={!isDirty}
          loading={saving}
          aria-label={saving ? t('common.saving') : t('settings.save')}
        >
          {saving ? '…' : t('settings.save')}
        </Button>
      </CardFooter>
    </Card>
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
    <Card as="section" aria-labelledby="approval-template-title">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <FileCheck2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" style={{ color: 'var(--lev-navy)' }} />
            <span id="approval-template-title">{t('settings.approvalTemplate')}</span>
          </span>
        }
        actions={
          <Tabs
            ariaLabel={t('settings.approvalTemplate')}
            items={[
              { key: 'he', label: t('settings.template.he') },
              { key: 'en', label: t('settings.template.en') },
            ]}
            value={lang}
            onChange={setLang}
            variant="pills"
          />
        }
      />

      <CardBody>
        <div className="space-y-4">
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('settings.template.downloadContext')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {t('settings.template.description')}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('settings.template.logoLinkHint')}
          </p>
          {!String(values.institution_logo_url ?? '').trim() && (
            <p
              className="text-xs rounded-lg border p-2"
              role="status"
              style={{
                borderColor: 'var(--status-warning)',
                color:         'var(--status-warning)',
                background:    'var(--surface-sunken)',
              }}
            >
              {t('settings.template.missingLogoWarning')}
            </p>
          )}
          {!String(signatureDataUrl ?? '').trim() && (
            <p
              className="text-xs rounded-lg border p-2"
              role="status"
              style={{
                borderColor: 'var(--status-warning)',
                color:         'var(--status-warning)',
                background:    'var(--surface-sunken)',
              }}
            >
              {t('settings.template.missingSignatureWarning')}
            </p>
          )}

          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold">{t('settings.template.placeholders')}</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {TEMPLATE_PLACEHOLDERS.map((token) => (
                <code
                  key={token}
                  className="px-1.5 py-0.5 font-mono"
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                  }}
                >
                  {token}
                </code>
              ))}
            </div>
          </div>

          <div
            className="p-3 space-y-2"
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.template.previewSource')}
            </p>
            <Tabs
              ariaLabel={t('settings.template.previewSource')}
              items={[
                { key: 'sample', label: t('settings.template.previewSample') },
                { key: 'real', label: t('settings.template.previewReal'), disabled: previewSubmissions.length === 0 },
              ]}
              value={previewSource}
              onChange={setPreviewSource}
              variant="pills"
            />
            {previewSource === 'real' && (
              <div className="space-y-2">
                <Select
                  value={previewSubmissionId}
                  onChange={(e) => onPreviewSubmissionChange(e.target.value)}
                  aria-label={t('settings.template.previewReal')}
                >
                  {previewSubmissions.length === 0 && (
                    <option value="">{t('settings.template.noApprovedSubmissions')}</option>
                  )}
                  {previewSubmissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {`${sub.applicationId} — ${sub.title}`}
                    </option>
                  ))}
                </Select>
                {previewLoading && (
                  <p role="status" className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('common.loading')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <FormField
              label={t('settings.templateFields.docTitle')}
              render={({ inputId }) => (
                <Input id={inputId} value={draft.docTitle} onChange={(e) => updateField('docTitle', e.target.value)} />
              )}
            />
            <FormField
              label={t('settings.templateFields.subject')}
              render={({ inputId }) => (
                <Input id={inputId} value={draft.subject} onChange={(e) => updateField('subject', e.target.value)} />
              )}
            />
            <FormField
              label={t('settings.templateFields.intro')}
              render={({ inputId }) => (
                <Textarea id={inputId} rows={3} value={draft.intro} onChange={(e) => updateField('intro', e.target.value)} />
              )}
            />
            <FormField
              label={t('settings.templateFields.conditionsTitle')}
              render={({ inputId }) => (
                <Input id={inputId} value={draft.conditionsTitle} onChange={(e) => updateField('conditionsTitle', e.target.value)} />
              )}
            />

            <div>
              <label className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
                {t('settings.templateFields.conditions')}
              </label>
              <div className="mt-2 space-y-2">
                {draft.conditions.map((condition, index) => (
                  <div key={`${lang}-cond-${index}`} className="flex items-start gap-2">
                    <Textarea
                      rows={2}
                      value={condition}
                      onChange={(e) => updateCondition(index, e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => removeCondition(index)}
                      disabled={draft.conditions.length <= 1}
                    >
                      {t('common.delete')}
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addCondition}
                  disabled={draft.conditions.length >= 8}
                >
                  {t('settings.template.addCondition')}
                </Button>
              </div>
            </div>

            <FormField
              label={t('settings.templateFields.signatureLabel')}
              render={({ inputId }) => (
                <Input id={inputId} value={draft.signatureLabel} onChange={(e) => updateField('signatureLabel', e.target.value)} />
              )}
            />
            <FormField
              label={t('settings.templateFields.legalFooter')}
              render={({ inputId }) => (
                <Textarea id={inputId} rows={2} value={draft.legalFooter} onChange={(e) => updateField('legalFooter', e.target.value)} />
              )}
            />

            <div>
              <label className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>
                {t('settings.template.signatureUpload')}
              </label>
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleSignatureFileChange}
                  className="text-sm bg-white"
                  style={{
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '10px 12px',
                    minHeight: 44,
                  }}
                />
                {signatureDataUrl && (
                  <div
                    className="p-2 bg-white"
                    style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}
                  >
                    <img
                      src={signatureDataUrl}
                      alt={t('settings.template.signaturePreviewAlt')}
                      className="max-h-16 object-contain"
                    />
                    <Button variant="secondary" size="sm" onClick={clearSignature} className="mt-2">
                      {t('settings.template.clearSignature')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="p-4"
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-sunken)',
            }}
            dir={lang === 'he' ? 'rtl' : 'ltr'}
          >
            <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.template.previewTitle')}
            </h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('settings.template.previewNote')}
            </p>
            <div
              className="bg-white p-4 space-y-2"
              style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}
            >
              <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                {renderTemplatePreviewText(draft.docTitle, previewContext)}
              </p>
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {renderTemplatePreviewText(draft.subject, previewContext)}
              </p>
              <p className="text-[12px] whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {renderTemplatePreviewText(draft.intro, previewContext)}
              </p>
              <p className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {renderTemplatePreviewText(draft.conditionsTitle, previewContext)}
              </p>
              <ul className="list-disc list-inside text-[12px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
                {draft.conditions.map((line, idx) => (
                  <li key={`preview-cond-${idx}`}>
                    {renderTemplatePreviewText(line, previewContext)}
                  </li>
                ))}
              </ul>
              <p className="text-[12px] font-semibold pt-1" style={{ color: 'var(--text-secondary)' }}>
                {renderTemplatePreviewText(draft.signatureLabel, previewContext)}
              </p>
              {signatureDataUrl && (
                <img
                  src={signatureDataUrl}
                  alt={t('settings.template.signaturePreviewAlt')}
                  className="max-h-16 object-contain"
                />
              )}
              <p
                className="text-[11px] pt-2"
                style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}
              >
                {renderTemplatePreviewText(draft.legalFooter, previewContext)}
              </p>
            </div>
          </div>

          <div
            className="p-3 space-y-2"
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {t('settings.template.historyTitle')}
            </p>
            {history.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('settings.template.noHistory')}
              </p>
            )}
            {history.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-auto">
                {history.map((entry, idx) => (
                  <div
                    key={entry.id || `history-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 bg-white"
                    style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <div>{formatDateForPreview(entry.editedAt || Date.now(), lang)}</div>
                      <div>{entry.editedByRole || 'UNKNOWN'}</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setDraft(entry.template)}>
                      {t('settings.template.restoreVersion')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>

      <CardFooter>
        <InlineToast toast={toast} />
        <div className="flex flex-wrap gap-2 justify-end ms-auto">
          <Button
            variant="secondary"
            onClick={handlePreviewPdf}
            loading={previewingPdf}
            leftIcon={<Eye size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
          >
            {previewingPdf ? t('common.loading') : t('settings.template.previewPdf')}
          </Button>
          <Button
            variant="secondary"
            onClick={resetToDefault}
            leftIcon={<RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
          >
            {t('settings.template.resetDefault')}
          </Button>
          <Button
            variant="gold"
            onClick={handleSave}
            disabled={!isDirty}
            loading={saving}
          >
            {saving ? '…' : t('settings.save')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export default function SettingsPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [values,  setValues]  = useState({})
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
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        backTo="/dashboard"
      />

      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex justify-center py-20 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('common.loading')}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {canUseCalendarSettings && (
            <Card as="section" aria-labelledby="calendar-connection-title">
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" style={{ color: 'var(--lev-navy)' }} />
                    <span id="calendar-connection-title">{t('settings.calendar.title')}</span>
                  </span>
                }
                actions={
                  <Badge tone={calendarStatus.connected ? 'success' : 'neutral'} size="sm">
                    {calendarStatus.connected
                      ? t('settings.calendar.connected')
                      : t('settings.calendar.notConnected')}
                  </Badge>
                }
              />
              <CardBody>
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t('settings.calendar.description')}
                  </p>

                  {calendarLoading && (
                    <p role="status" className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('common.loading')}
                    </p>
                  )}

                  {!calendarLoading && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleConnect('google')}
                          disabled={calendarBusy}
                        >
                          {t('settings.calendar.connectGoogle')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleConnect('microsoft')}
                          disabled={calendarBusy}
                        >
                          {t('settings.calendar.connectMicrosoft')}
                        </Button>
                      </div>

                      <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
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

                      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(calendarStatus.syncEnabled)}
                          onChange={(e) => handleSyncToggle(e.target.checked)}
                          disabled={!calendarStatus.connected || calendarBusy}
                          className="w-4 h-4"
                        />
                        <span>{t('settings.calendar.enablePersonalSync')}</span>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          onClick={handleDisconnect}
                          disabled={!calendarStatus.connected || calendarBusy}
                        >
                          {t('settings.calendar.disconnect')}
                        </Button>
                      </div>
                    </>
                  )}

                  {calendarMessage && (
                    <p
                      role="status"
                      aria-live="polite"
                      className="text-xs font-semibold"
                      style={{ color: 'var(--status-info)' }}
                    >
                      {calendarMessage}
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
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
  )
}
