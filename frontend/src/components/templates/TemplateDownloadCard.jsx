/**
 * Template Download Card (Researcher Dashboard)
 * Displays available system templates with view (inline preview) and download
 * actions for both languages.
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, AlertCircle, Eye } from 'lucide-react'
import * as systemTemplatesApi from '../../services/systemTemplates.api.js'
import { Card, CardHeader } from '../ui'
import Modal from '../ui/Modal'

const TEMPLATE_KEY = 'questionnaire_preface'

/**
 * Returns whether a MIME type is natively previewable in-browser.
 * @param {string} mime
 * @returns {boolean}
 */
function canInlinePreview(mime) {
  if (!mime) return false
  return (
    mime === 'application/pdf' ||
    mime.startsWith('image/') ||
    mime.startsWith('text/')
  )
}

/**
 * Single template row with view + download actions.
 * @param {object} props
 * @param {string} props.langLabel - Human-readable language label (e.g. "עברית")
 * @param {number} [props.version] - Template version number
 * @param {string} props.templateName - Localized template display name
 * @param {function} props.onPreview - View handler
 * @param {function} props.onDownload - Download handler
 * @returns {JSX.Element}
 */
function TemplateRow({ langLabel, version, templateName, onPreview, onDownload }) {
  const { t } = useTranslation()
  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between gap-3 rounded-lg"
      style={{
        background: 'var(--lev-navy-50)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="text-right flex-1 min-w-0">
        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {templateName}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {langLabel}
          {version ? ` • v${version}` : ''}
        </p>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onPreview}
          aria-label={t('systemTemplates.viewLabel', { lang: langLabel })}
          title={t('systemTemplates.viewLabel', { lang: langLabel })}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--lev-teal-50)]"
          style={{ color: 'var(--lev-navy)' }}
        >
          <Eye size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label={t('systemTemplates.downloadDocLabel', { lang: langLabel })}
          title={t('systemTemplates.downloadDocLabel', { lang: langLabel })}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--lev-teal-50)]"
          style={{ color: 'var(--lev-teal-text)' }}
        >
          <Download size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </button>
      </div>
    </div>
  )
}

export default function TemplateDownloadCard() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewLang, setPreviewLang] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  /**
   * Returns true when an API error indicates "no active template".
   * @param {unknown} err
   * @returns {boolean}
   */
  function isTemplateMissingError(err) {
    return Boolean(err && typeof err === 'object' && err.code === 'TEMPLATE_NOT_FOUND')
  }

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [heRes, enRes] = await Promise.allSettled([
        systemTemplatesApi.getActiveTemplate(TEMPLATE_KEY, 'he'),
        systemTemplatesApi.getActiveTemplate(TEMPLATE_KEY, 'en'),
      ])

      const nextTemplates = { he: null, en: null }
      let hasUnexpectedFailure = false

      if (heRes.status === 'fulfilled') {
        nextTemplates.he = heRes.value
      } else if (!isTemplateMissingError(heRes.reason)) {
        hasUnexpectedFailure = true
      }

      if (enRes.status === 'fulfilled') {
        nextTemplates.en = enRes.value
      } else if (!isTemplateMissingError(enRes.reason)) {
        hasUnexpectedFailure = true
      }

      setTemplates(nextTemplates)
      if (hasUnexpectedFailure) {
        setError(t('systemTemplates.loadError'))
      }
    } catch {
      setError(t('systemTemplates.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  /**
   * Downloads the template file for a given language.
   * @param {string} lang
   */
  async function handleDownload(lang) {
    try {
      const blob = await systemTemplatesApi.downloadTemplate(TEMPLATE_KEY, lang)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `questionnaire-preface-${lang}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      setError(t('systemTemplates.downloadError'))
    }
  }

  /**
   * Loads template preview via authenticated blob fetch.
   * @param {string} lang
   */
  async function handlePreview(lang) {
    setPreviewLang(lang)
    setPreviewLoading(true)
    setError(null)
    try {
      const blob = await systemTemplatesApi.previewTemplate(TEMPLATE_KEY, lang)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setPreviewLang(null)
      setError(t('documents.previewError.generic'))
    } finally {
      setPreviewLoading(false)
    }
  }

  /** Closes preview modal and revokes blob URL. */
  function closePreview() {
    setPreviewLang(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
  }

  const previewTemplate = previewLang ? templates[previewLang] : null

  if (loading) {
    return null
  }

  if (error) {
    return (
      <Card>
        <CardHeader title={t('systemTemplates.usefulDocuments')} />
        <div
          className="m-4 p-4 flex gap-3"
          role="alert"
          style={{
            background: 'var(--status-warning-50)',
            border: '1px solid var(--status-warning)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--status-warning)',
          }}
        >
          <AlertCircle size={20} className="flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    )
  }

  // Only show card if at least one template exists
  if (!templates.he && !templates.en) {
    return null
  }

  return (
    <Card>
      <CardHeader title={t('systemTemplates.usefulDocuments')} />
      <div className="p-4 space-y-3">
        {templates.he && (
          <TemplateRow
            langLabel="עברית"
            version={templates.he.version}
            templateName={t('systemTemplates.questionnaire_preface')}
            onPreview={() => handlePreview('he')}
            onDownload={() => handleDownload('he')}
          />
        )}

        {templates.en && (
          <TemplateRow
            langLabel="English"
            version={templates.en.version}
            templateName={t('systemTemplates.questionnaire_preface')}
            onPreview={() => handlePreview('en')}
            onDownload={() => handleDownload('en')}
          />
        )}
      </div>

      <Modal
        open={Boolean(previewLang)}
        onClose={closePreview}
        title={t('documents.previewTitle')}
        description={t('systemTemplates.questionnaire_preface')}
        size="lg"
        closeLabel={t('documents.closePreviewLabel')}
      >
        {previewTemplate && (
          <div className="space-y-3">
            {previewLoading ? (
              <p className="text-sm text-center py-8 text-gray-500">{t('common.loading')}</p>
            ) : canInlinePreview(previewTemplate.mimeType) && previewUrl ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <iframe
                  title={t('documents.previewFrameLabel', {
                    name: t('systemTemplates.questionnaire_preface'),
                  })}
                  src={previewUrl}
                  className="w-full h-[65vh]"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  {t('documents.previewUnsupported')}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewLang)}
                    className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: 'var(--lev-teal)' }}
                  >
                    {t('documents.downloadFallback')}
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">{t('documents.previewHint')}</p>
          </div>
        )}
      </Modal>
    </Card>
  )
}
