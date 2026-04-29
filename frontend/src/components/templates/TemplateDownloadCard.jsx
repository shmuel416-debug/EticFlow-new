/**
 * Template Download Card (Researcher Dashboard)
 * Displays available system templates with download links for both languages
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, AlertCircle } from 'lucide-react'
import * as systemTemplatesApi from '../../services/systemTemplates.api.js'
import { Card, CardHeader } from '../ui'

export default function TemplateDownloadCard() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        systemTemplatesApi.getActiveTemplate('questionnaire_preface', 'he'),
        systemTemplatesApi.getActiveTemplate('questionnaire_preface', 'en'),
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

  async function handleDownload(lang) {
    try {
      const blob = await systemTemplatesApi.downloadTemplate('questionnaire_preface', lang)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `questionnaire-preface-${lang}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      setError(t('systemTemplates.downloadError'))
    }
  }

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
          <button
            onClick={() => handleDownload('he')}
            className="w-full text-right px-4 py-3 flex items-center justify-between gap-3 rounded-lg transition-colors"
            style={{
              background: 'var(--lev-navy-50)',
              border: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lev-navy)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--lev-navy-50)')}
          >
            <div className="text-right flex-1">
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('systemTemplates.questionnaire_preface')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                עברית • {templates.he.version && `v${templates.he.version}`}
              </p>
            </div>
            <Download size={18} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
          </button>
        )}

        {templates.en && (
          <button
            onClick={() => handleDownload('en')}
            className="w-full text-right px-4 py-3 flex items-center justify-between gap-3 rounded-lg transition-colors"
            style={{
              background: 'var(--lev-navy-50)',
              border: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lev-navy)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--lev-navy-50)')}
          >
            <div className="text-right flex-1">
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                {t('systemTemplates.questionnaire_preface')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                English • {templates.en.version && `v${templates.en.version}`}
              </p>
            </div>
            <Download size={18} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>
    </Card>
  )
}
