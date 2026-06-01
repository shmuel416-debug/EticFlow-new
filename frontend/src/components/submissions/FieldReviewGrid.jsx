/**
 * Ethic-Net — FieldReviewGrid
 * Dynamic reviewer evaluation grid: form answer on one side, reviewer status on the other.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Select, Textarea } from '../ui'
import {
  getReviewerChecklist,
  saveReviewerChecklistDraft,
  submitReviewerChecklist,
} from '../../services/reviewerChecklist.api'
import { FieldAnswer } from './FormAnswersViewer'

const EMPTY_ROW = Object.freeze({ status: '', comment: '' })
const REVIEW_STATUSES = ['VALID', 'INVALID', 'NA']

/**
 * Builds editable map from API rows.
 * @param {Array<{ fieldKey: string, status: string, comment?: string }>} rows
 * @returns {Record<string, { status: string, comment: string }>}
 */
function createResponseMap(rows) {
  return (rows || []).reduce((acc, row) => {
    acc[row.fieldKey] = { status: row.status || '', comment: row.comment || '' }
    return acc
  }, {})
}

/**
 * @param {{ submissionId: string, onSuccess?: () => void }} props
 * @returns {JSX.Element}
 */
export default function FieldReviewGrid({ submissionId, onSuccess }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fields, setFields] = useState([])
  const [dataJson, setDataJson] = useState({})
  const [review, setReview] = useState(null)
  const [responses, setResponses] = useState({})
  const [generalNote, setGeneralNote] = useState('')
  const [impression, setImpression] = useState('')
  const [recommendation, setRecommendation] = useState('')

  /**
   * Loads reviewer review payload for this submission.
   * @returns {Promise<void>}
   */
  async function loadReview() {
    setLoading(true)
    setError('')
    try {
      const data = await getReviewerChecklist(submissionId)
      setFields(data?.fields ?? [])
      setDataJson(data?.dataJson ?? {})
      setReview(data?.review ?? null)
      setResponses(createResponseMap(data?.responses ?? []))
      setGeneralNote(data?.review?.generalNote ?? '')
      setImpression(data?.review?.impression ?? '')
      setRecommendation(data?.review?.recommendation ?? '')
    } catch {
      setError(t('reviewer.fieldReview.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const stats = useMemo(() => {
    const answered = fields.filter((field) => {
      const key = field.id || field.key
      return Boolean(key && responses[key]?.status)
    }).length
    return { answered, total: fields.length }
  }, [fields, responses])

  /**
   * Converts UI map to API response array.
   * @returns {Array<{ fieldKey: string, status: string, comment?: string }>}
   */
  function buildResponsesPayload() {
    return Object.entries(responses)
      .filter(([, row]) => REVIEW_STATUSES.includes(row?.status))
      .map(([fieldKey, row]) => ({
        fieldKey,
        status: row.status,
        comment: row.comment?.trim() || undefined,
      }))
  }

  /**
   * Updates status for one field.
   * @param {string} fieldKey
   * @param {string} status
   */
  function handleStatusChange(fieldKey, status) {
    setResponses((prev) => ({ ...prev, [fieldKey]: { ...EMPTY_ROW, ...prev[fieldKey], status } }))
  }

  /**
   * Updates comment for one field.
   * @param {string} fieldKey
   * @param {string} comment
   */
  function handleCommentChange(fieldKey, comment) {
    setResponses((prev) => ({ ...prev, [fieldKey]: { ...EMPTY_ROW, ...prev[fieldKey], comment } }))
  }

  /**
   * Persists current draft.
   * @returns {Promise<void>}
   */
  async function handleSaveDraft() {
    setSaving(true)
    setNotice('')
    setError('')
    try {
      await saveReviewerChecklistDraft(submissionId, {
        responses: buildResponsesPayload(),
        generalNote: generalNote.trim() || undefined,
        impression: impression.trim() || undefined,
      })
      setNotice(t('reviewer.fieldReview.saved'))
    } catch {
      setError(t('reviewer.fieldReview.saveError'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Submits final reviewer evaluation.
   * @returns {Promise<void>}
   */
  async function handleSubmit() {
    if (!recommendation) {
      setError(t('reviewer.fieldReview.recommendationRequired'))
      return
    }
    setSubmitting(true)
    setNotice('')
    setError('')
    try {
      await submitReviewerChecklist(submissionId, {
        responses: buildResponsesPayload(),
        generalNote: generalNote.trim() || undefined,
        impression: impression.trim() || undefined,
        recommendation,
      })
      setNotice(t('reviewer.fieldReview.submitted'))
      onSuccess?.()
    } catch {
      setError(t('reviewer.fieldReview.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
  }

  if (!fields.length) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('submission.detail.noAnswer')}</p>
  }

  const isSubmitted = review?.status === 'SUBMITTED'

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--status-danger)', background: 'var(--status-danger-50)' }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--status-success)', background: 'var(--status-success-50)' }}>
          {notice}
        </p>
      ) : null}

      <Card as="section">
        <CardHeader
          title={t('reviewer.fieldReview.panelTitle')}
          subtitle={t('reviewer.fieldReview.requiredProgress', { answered: stats.answered, total: stats.total })}
        />
        <CardBody className="space-y-3">
          {fields.map((field) => {
            const fieldKey = field.id || field.key
            if (!fieldKey) return null
            const value = Object.prototype.hasOwnProperty.call(dataJson, field.id)
              ? dataJson[field.id]
              : Object.prototype.hasOwnProperty.call(dataJson, field.key)
                ? dataJson[field.key]
                : undefined
            const row = responses[fieldKey] || EMPTY_ROW
            const requiresComment = row.status === 'INVALID'
            const showWarning = requiresComment && !row.comment?.trim()
            return (
              <article key={fieldKey} className="rounded-xl border p-3 md:p-4 space-y-3" style={{ borderColor: 'var(--border-default)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)' }}>
                    <FieldAnswer field={field} value={value} />
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={row.status}
                      disabled={isSubmitted}
                      onChange={(event) => handleStatusChange(fieldKey, event.target.value)}
                      aria-label={t('reviewer.fieldReview.statusLabel')}
                    >
                      <option value="">{t('reviewer.fieldReview.selectStatus')}</option>
                      <option value="VALID">{t('reviewer.fieldReview.status.VALID')}</option>
                      <option value="INVALID">{t('reviewer.fieldReview.status.INVALID')}</option>
                      <option value="NA">{t('reviewer.fieldReview.status.NA')}</option>
                    </Select>
                    <Textarea
                      rows={3}
                      value={row.comment}
                      disabled={isSubmitted}
                      onChange={(event) => handleCommentChange(fieldKey, event.target.value)}
                      placeholder={t('reviewer.fieldReview.commentPlaceholder')}
                    />
                    {showWarning ? (
                      <p className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--status-warning)' }}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        {t('reviewer.fieldReview.commentRequired')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </CardBody>
      </Card>

      <Card as="section">
        <CardHeader title={t('reviewer.fieldReview.summaryTitle')} />
        <CardBody className="space-y-3">
          <Textarea
            rows={4}
            value={generalNote}
            disabled={isSubmitted}
            onChange={(event) => setGeneralNote(event.target.value)}
            placeholder={t('reviewer.fieldReview.summaryPlaceholder')}
          />
          <Textarea
            rows={4}
            value={impression}
            disabled={isSubmitted}
            onChange={(event) => setImpression(event.target.value)}
            placeholder={t('reviewer.fieldReview.impressionPlaceholder')}
          />
          <Select
            value={recommendation}
            disabled={isSubmitted}
            onChange={(event) => setRecommendation(event.target.value)}
            aria-label={t('reviewer.fieldReview.recommendationLabel')}
          >
            <option value="">{t('reviewer.fieldReview.selectRecommendation')}</option>
            <option value="EXEMPT">{t('reviewer.fieldReview.recommendation.EXEMPT')}</option>
            <option value="APPROVED">{t('reviewer.fieldReview.recommendation.APPROVED')}</option>
            <option value="APPROVED_CONDITIONAL">{t('reviewer.fieldReview.recommendation.APPROVED_CONDITIONAL')}</option>
            <option value="REVISION_REQUIRED">{t('reviewer.fieldReview.recommendation.REVISION_REQUIRED')}</option>
            <option value="REJECTED">{t('reviewer.fieldReview.recommendation.REJECTED')}</option>
          </Select>

          {!isSubmitted ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={handleSaveDraft} loading={saving}>
                {t('reviewer.fieldReview.saveDraft')}
              </Button>
              <Button type="button" onClick={handleSubmit} loading={submitting}>
                {t('reviewer.fieldReview.submit')}
              </Button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--status-success)' }}>
              {t('reviewer.fieldReview.alreadySubmitted')}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
