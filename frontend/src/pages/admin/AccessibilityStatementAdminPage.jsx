/**
 * EthicFlow — Admin accessibility statement editor.
 * Allows ADMIN users to edit bilingual markdown content and metadata.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Eye, Plus, Save, RotateCcw, Trash2, ArrowUp, ArrowDown, AlertTriangle,
} from 'lucide-react'
import {
  PageHeader, Card, CardHeader, CardBody, CardFooter, FormField, Input,
  Textarea, Select, Tabs, Button,
} from '../../components/ui'
import {
  getAdminStatement,
  getDefaultAccessibilityStatement,
  normalizeAccessibilityStatement,
  saveStatement,
} from '../../services/accessibilityStatement.api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Builds a section draft object.
 * @param {{ index: number }} params
 * @returns {{id: string, title: string, body: string, variant: 'default'|'warning'}}
 */
function createSectionDraft({ index }) {
  return {
    id: `section_${Date.now()}_${index + 1}`,
    title: '',
    body: '',
    variant: 'default',
  }
}

/**
 * Validates admin form values for save readiness.
 * @param {object} statement
 * @returns {Record<string, string>}
 */
function validateStatement(statement) {
  const errors = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statement.lastUpdated || '')) {
    errors.lastUpdated = 'invalidDate'
  }
  if (!EMAIL_PATTERN.test(statement.contactEmail || '')) {
    errors.contactEmail = 'invalidEmail'
  }
  if (!EMAIL_PATTERN.test(statement.committeeEmail || '')) {
    errors.committeeEmail = 'invalidEmail'
  }
  if (!Number.isInteger(statement.responseTimeBusinessDays) || statement.responseTimeBusinessDays < 1) {
    errors.responseTimeBusinessDays = 'invalidDays'
  }
  ;(['he', 'en']).forEach((lang) => {
    const local = statement[lang]
    if (!local?.title?.trim()) errors[`${lang}.title`] = 'required'
    if (!Array.isArray(local?.sections) || local.sections.length === 0) {
      errors[`${lang}.sections`] = 'required'
      return
    }
    local.sections.forEach((section, index) => {
      if (!String(section.title || '').trim()) errors[`${lang}.sections.${index}.title`] = 'required'
      if (!String(section.body || '').trim()) errors[`${lang}.sections.${index}.body`] = 'required'
    })
  })
  return errors
}

/**
 * Accessibility statement admin editor page.
 * @returns {JSX.Element}
 */
export default function AccessibilityStatementAdminPage() {
  const { t, i18n } = useTranslation()
  const [lang, setLang] = useState('he')
  const [statement, setStatement] = useState(getDefaultAccessibilityStatement())
  const [savedSnapshot, setSavedSnapshot] = useState(getDefaultAccessibilityStatement())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [toast, setToast] = useState(null)

  const isRtl = i18n.dir() === 'rtl'
  const langTabs = useMemo(() => ([
    { key: 'he', label: t('admin.accessibilityStatement.tabs.he') },
    { key: 'en', label: t('admin.accessibilityStatement.tabs.en') },
  ]), [t])
  const isDirty = JSON.stringify(statement) !== JSON.stringify(savedSnapshot)
  const errors = useMemo(() => validateStatement(statement), [statement])
  const activeLocale = statement[lang]

  useEffect(() => {
    let cancelled = false

    /**
     * Loads statement payload from admin settings endpoint.
     * @returns {Promise<void>}
     */
    async function load() {
      setLoading(true)
      try {
        const value = await getAdminStatement()
        if (cancelled) return
        setStatement(value)
        setSavedSnapshot(value)
      } catch {
        if (cancelled) return
        const fallback = getDefaultAccessibilityStatement()
        setStatement(fallback)
        setSavedSnapshot(fallback)
        setToast({ type: 'error', msg: t('admin.accessibilityStatement.messages.loadFailed') })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [t])

  /**
   * Updates root-level metadata field.
   * @param {string} key
   * @param {string|number} value
   * @returns {void}
   */
  function updateMeta(key, value) {
    setStatement((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Updates title for the active language.
   * @param {string} value
   * @returns {void}
   */
  function updateLocalizedTitle(value) {
    setStatement((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], title: value },
    }))
  }

  /**
   * Updates a section field by index for active language.
   * @param {number} index
   * @param {'title'|'body'|'variant'} field
   * @param {string} value
   * @returns {void}
   */
  function updateSection(index, field, value) {
    setStatement((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        sections: prev[lang].sections.map((section, i) => (
          i === index ? { ...section, [field]: value } : section
        )),
      },
    }))
  }

  /**
   * Adds an empty section to active language.
   * @returns {void}
   */
  function addSection() {
    setStatement((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        sections: [...prev[lang].sections, createSectionDraft({ index: prev[lang].sections.length })],
      },
    }))
  }

  /**
   * Removes section from active language.
   * @param {number} index
   * @returns {void}
   */
  function removeSection(index) {
    setStatement((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        sections: prev[lang].sections.filter((_section, i) => i !== index),
      },
    }))
  }

  /**
   * Reorders section in active language.
   * @param {number} index
   * @param {'up'|'down'} direction
   * @returns {void}
   */
  function moveSection(index, direction) {
    const offset = direction === 'up' ? -1 : 1
    const nextIndex = index + offset
    setStatement((prev) => {
      const sections = [...prev[lang].sections]
      if (nextIndex < 0 || nextIndex >= sections.length) return prev
      const temp = sections[index]
      sections[index] = sections[nextIndex]
      sections[nextIndex] = temp
      return {
        ...prev,
        [lang]: { ...prev[lang], sections },
      }
    })
  }

  /**
   * Restores local draft to default values after confirmation.
   * @returns {void}
   */
  function restoreDefaults() {
    if (!window.confirm(t('admin.accessibilityStatement.confirm.restoreDefault'))) return
    setStatement(getDefaultAccessibilityStatement())
    setToast({ type: 'success', msg: t('admin.accessibilityStatement.messages.restored') })
  }

  /**
   * Saves statement to backend.
   * @returns {Promise<void>}
   */
  async function handleSave() {
    const currentErrors = validateStatement(statement)
    if (Object.keys(currentErrors).length > 0) {
      setToast({ type: 'error', msg: t('admin.accessibilityStatement.messages.validationFailed') })
      return
    }
    setSaving(true)
    setToast(null)
    try {
      const normalized = normalizeAccessibilityStatement(statement)
      await saveStatement(normalized)
      setSavedSnapshot(normalized)
      setStatement(normalized)
      setLastSavedAt(new Date().toISOString())
      setToast({ type: 'success', msg: t('admin.accessibilityStatement.messages.saved') })
    } catch {
      setToast({ type: 'error', msg: t('admin.accessibilityStatement.messages.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('admin.accessibilityStatement.title')}
        subtitle={lastSavedAt
          ? t('admin.accessibilityStatement.lastSavedAt', { date: new Date(lastSavedAt).toLocaleString(lang === 'he' ? 'he-IL' : 'en-GB') })
          : t('admin.accessibilityStatement.subtitle')}
      />

      <Card as="section">
        <CardBody>
          <Tabs
            items={langTabs}
            value={lang}
            onChange={setLang}
            ariaLabel={t('admin.accessibilityStatement.tabs.label')}
            variant="pills"
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card as="section" aria-labelledby="accessibility-meta-title">
            <CardHeader title={<span id="accessibility-meta-title">{t('admin.accessibilityStatement.metadata.title')}</span>} />
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label={t('admin.accessibilityStatement.metadata.lastUpdated')}
                  error={errors.lastUpdated ? t('admin.accessibilityStatement.errors.invalidDate') : undefined}
                  render={({ inputId, describedBy, invalid }) => (
                    <Input
                      id={inputId}
                      type="date"
                      value={statement.lastUpdated}
                      onChange={(event) => updateMeta('lastUpdated', event.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                    />
                  )}
                />
                <FormField
                  label={t('admin.accessibilityStatement.metadata.responseDays')}
                  error={errors.responseTimeBusinessDays ? t('admin.accessibilityStatement.errors.invalidDays') : undefined}
                  render={({ inputId, describedBy, invalid }) => (
                    <Input
                      id={inputId}
                      type="number"
                      min={1}
                      max={60}
                      value={statement.responseTimeBusinessDays}
                      onChange={(event) => updateMeta('responseTimeBusinessDays', Number(event.target.value || 0))}
                      aria-describedby={describedBy}
                      invalid={invalid}
                    />
                  )}
                />
                <FormField
                  label={t('admin.accessibilityStatement.metadata.contactEmail')}
                  error={errors.contactEmail ? t('admin.accessibilityStatement.errors.invalidEmail') : undefined}
                  render={({ inputId, describedBy, invalid }) => (
                    <Input
                      id={inputId}
                      type="email"
                      value={statement.contactEmail}
                      onChange={(event) => updateMeta('contactEmail', event.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      dir="ltr"
                    />
                  )}
                />
                <FormField
                  label={t('admin.accessibilityStatement.metadata.committeeEmail')}
                  error={errors.committeeEmail ? t('admin.accessibilityStatement.errors.invalidEmail') : undefined}
                  render={({ inputId, describedBy, invalid }) => (
                    <Input
                      id={inputId}
                      type="email"
                      value={statement.committeeEmail}
                      onChange={(event) => updateMeta('committeeEmail', event.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      dir="ltr"
                    />
                  )}
                />
              </div>
            </CardBody>
          </Card>

          <Card as="section" aria-labelledby="accessibility-sections-title">
            <CardHeader
              title={<span id="accessibility-sections-title">{t('admin.accessibilityStatement.sections.title')}</span>}
              subtitle={t('admin.accessibilityStatement.sections.subtitle')}
            />
            <CardBody>
              <div className="space-y-4">
                <FormField
                  label={t('admin.accessibilityStatement.sections.pageTitle')}
                  error={errors[`${lang}.title`] ? t('common.requiredField') : undefined}
                  render={({ inputId, describedBy, invalid }) => (
                    <Input
                      id={inputId}
                      value={activeLocale.title}
                      onChange={(event) => updateLocalizedTitle(event.target.value)}
                      aria-describedby={describedBy}
                      invalid={invalid}
                    />
                  )}
                />

                {activeLocale.sections.map((section, index) => (
                  <Card key={section.id} as="article" className="border border-gray-100">
                    <CardHeader
                      title={t('admin.accessibilityStatement.sections.sectionHeading', { index: index + 1 })}
                      actions={(
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0}
                            aria-label={t('admin.accessibilityStatement.actions.moveUp')}
                            className="min-w-[44px] min-h-[44px]"
                          >
                            <ArrowUp size={16} strokeWidth={1.8} aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === activeLocale.sections.length - 1}
                            aria-label={t('admin.accessibilityStatement.actions.moveDown')}
                            className="min-w-[44px] min-h-[44px]"
                          >
                            <ArrowDown size={16} strokeWidth={1.8} aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => removeSection(index)}
                            disabled={activeLocale.sections.length <= 1}
                            aria-label={t('admin.accessibilityStatement.actions.removeSection')}
                            className="min-w-[44px] min-h-[44px]"
                          >
                            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    />
                    <CardBody>
                      <div className="space-y-3">
                        <FormField
                          label={t('admin.accessibilityStatement.sections.sectionTitle')}
                          error={errors[`${lang}.sections.${index}.title`] ? t('common.requiredField') : undefined}
                          render={({ inputId, describedBy, invalid }) => (
                            <Input
                              id={inputId}
                              value={section.title}
                              onChange={(event) => updateSection(index, 'title', event.target.value)}
                              aria-describedby={describedBy}
                              invalid={invalid}
                            />
                          )}
                        />
                        <FormField
                          label={t('admin.accessibilityStatement.sections.variant')}
                          render={({ inputId }) => (
                            <Select
                              id={inputId}
                              value={section.variant}
                              onChange={(event) => updateSection(index, 'variant', event.target.value)}
                            >
                              <option value="default">{t('admin.accessibilityStatement.sections.variantDefault')}</option>
                              <option value="warning">{t('admin.accessibilityStatement.sections.variantWarning')}</option>
                            </Select>
                          )}
                        />
                        <FormField
                          label={t('admin.accessibilityStatement.sections.body')}
                          hint={t('admin.accessibilityStatement.sections.bodyHint')}
                          error={errors[`${lang}.sections.${index}.body`] ? t('common.requiredField') : undefined}
                          render={({ inputId, describedBy, invalid }) => (
                            <>
                              <Textarea
                                id={inputId}
                                rows={12}
                                value={section.body}
                                onChange={(event) => updateSection(index, 'body', event.target.value)}
                                aria-describedby={describedBy}
                                invalid={invalid}
                                className="font-mono"
                                dir={isRtl ? 'rtl' : 'ltr'}
                              />
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {t('admin.accessibilityStatement.sections.charCount', { count: section.body.length })}
                              </p>
                            </>
                          )}
                        />
                      </div>
                    </CardBody>
                  </Card>
                ))}

                <Button
                  variant="secondary"
                  onClick={addSection}
                  leftIcon={<Plus size={16} strokeWidth={2} aria-hidden="true" />}
                >
                  {t('admin.accessibilityStatement.actions.addSection')}
                </Button>
              </div>
            </CardBody>
            <CardFooter>
              <div className="flex flex-wrap gap-2 w-full items-center">
                <Button
                  variant="gold"
                  loading={saving}
                  onClick={handleSave}
                  leftIcon={<Save size={16} strokeWidth={2} aria-hidden="true" />}
                  disabled={!isDirty || loading}
                >
                  {t('admin.accessibilityStatement.actions.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={restoreDefaults}
                  leftIcon={<RotateCcw size={16} strokeWidth={2} aria-hidden="true" />}
                  disabled={saving}
                >
                  {t('admin.accessibilityStatement.actions.restoreDefault')}
                </Button>
                <StatusToast toast={toast} />
              </div>
            </CardFooter>
          </Card>
        </div>

        <Card as="section" aria-labelledby="accessibility-preview-title">
          <CardHeader
            title={<span id="accessibility-preview-title" className="inline-flex items-center gap-2"><Eye size={16} aria-hidden="true" />{t('admin.accessibilityStatement.preview.title')}</span>}
            subtitle={t('admin.accessibilityStatement.preview.subtitle')}
          />
          <CardBody>
            <div className="space-y-4" dir={lang === 'he' ? 'rtl' : 'ltr'}>
              <h2 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{activeLocale.title}</h2>
              {activeLocale.sections.map((section) => (
                <article key={`preview-${section.id}`} className="space-y-2">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--lev-navy)' }}>{section.title}</h3>
                  {section.variant === 'warning' ? (
                    <div
                      className="flex items-start gap-2.5 p-3 rounded-lg"
                      style={{
                        background: 'var(--status-warning-50)',
                        border: '1px solid var(--status-warning)',
                      }}
                    >
                      <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 2 }} />
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.body}</ReactMarkdown>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

/**
 * Inline save/status toast.
 * @param {{ toast: { type: 'success'|'error', msg: string } | null }} props
 * @returns {JSX.Element}
 */
function StatusToast({ toast }) {
  if (!toast) return <p className="text-xs" aria-live="polite" />
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-xs font-semibold"
      style={{ color: toast.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)' }}
    >
      {toast.msg}
    </p>
  )
}
