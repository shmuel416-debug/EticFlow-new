/**
 * EthicFlow — ChecklistRenderer
 * Renders a dynamic reviewer checklist for one submission.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import {
  Button, Card, CardBody, CardHeader, Select, Textarea, Badge,
} from '../ui'
import {
  getReviewerChecklist,
  saveReviewerChecklistDraft,
  submitReviewerChecklist,
} from '../../services/reviewerChecklist.api'

const NEGATIVE_ANSWERS = new Set(['INADEQUATE', 'YES'])

/**
 * Returns answer options by section answer type.
 * @param {'ADEQUACY'|'YES_NO'|'YES_NO_PROBLEM'} answerType
 * @param {(key: string) => string} t
 * @returns {{ value: string, label: string }[]}
 */
function getAnswerOptions(answerType, t) {
  if (answerType === 'ADEQUACY') {
    return [
      { value: '', label: t('reviewer.checklist.selectAnswer') },
      { value: 'ADEQUATE', label: t('reviewer.checklist.answer.ADEQUATE') },
      { value: 'INADEQUATE', label: t('reviewer.checklist.answer.INADEQUATE') },
      { value: 'NA', label: t('reviewer.checklist.answer.NA') },
    ]
  }
  return [
    { value: '', label: t('reviewer.checklist.selectAnswer') },
    { value: 'YES', label: t('reviewer.checklist.answer.YES') },
    { value: 'NO', label: t('reviewer.checklist.answer.NO') },
    { value: 'NA', label: t('reviewer.checklist.answer.NA') },
  ]
}

/**
 * Builds editable response map from API payload.
 * @param {object[]} responses
 * @returns {Record<string, { itemCode: string, answer: string, details: string }>}
 */
function createResponseMap(responses) {
  return (responses || []).reduce((acc, row) => {
    acc[row.itemId] = {
      itemCode: row.itemCode,
      answer: row.answer || '',
      details: row.details || '',
    }
    return acc
  }, {})
}

/**
 * Checks if an item should be visible based on conditional rule.
 * @param {object} item
 * @param {Record<string, string>} answersByCode
 * @returns {boolean}
 */
function isItemVisible(item, answersByCode) {
  const rule = item?.conditional
  if (!rule || typeof rule !== 'object') return true
  const dependsOn = rule.dependsOn
  const showWhen = rule.showWhen
  if (!dependsOn || !showWhen) return true
  const current = answersByCode[dependsOn]
  if (!current) return false
  if (Array.isArray(showWhen)) return showWhen.includes(current)
  return current === showWhen
}

/**
 * @param {{ submissionId: string, onSuccess?: () => void }} props
 * @returns {JSX.Element}
 */
export default function ChecklistRenderer({ submissionId, onSuccess }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [template, setTemplate] = useState(null)
  const [review, setReview] = useState(null)
  const [responses, setResponses] = useState({})
  const [generalNote, setGeneralNote] = useState('')
  const [recommendation, setRecommendation] = useState('')

  /**
   * Loads checklist data from API.
   * @returns {Promise<void>}
   */
  async function loadChecklist() {
    setLoading(true)
    setError('')
    try {
      const data = await getReviewerChecklist(submissionId)
      setTemplate(data?.template ?? null)
      setReview(data?.review ?? null)
      setResponses(createResponseMap(data?.responses ?? []))
      setGeneralNote(data?.review?.generalNote ?? '')
      setRecommendation(data?.review?.recommendation ?? '')
    } catch {
      setError(t('reviewer.checklist.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChecklist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const sections = useMemo(() => template?.sections ?? [], [template])

  const stats = useMemo(() => {
    const allItems = sections.flatMap((section) => section.items || [])
    const answersByCode = allItems.reduce((acc, item) => {
      const answer = responses[item.id]?.answer
      if (answer) acc[item.code] = answer
      return acc
    }, {})
    const visibleItems = allItems.filter((item) => isItemVisible(item, answersByCode))
    const requiredItems = visibleItems.filter((item) => item.isRequired !== false)
    const requiredAnswered = requiredItems.filter((item) => responses[item.id]?.answer).length
    return { requiredTotal: requiredItems.length, requiredAnswered, visibleIds: new Set(visibleItems.map((item) => item.id)) }
  }, [responses, sections])

  /**
   * Updates answer for one checklist item.
   * @param {string} itemId
   * @param {string} itemCode
   * @param {string} answer
   */
  function handleAnswerChange(itemId, itemCode, answer) {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { itemCode, answer, details: prev[itemId]?.details ?? '' },
    }))
  }

  /**
   * Updates free-text details for one checklist item.
   * @param {string} itemId
   * @param {string} details
   */
  function handleDetailsChange(itemId, details) {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], details },
    }))
  }

  /**
   * Converts UI map to API response array.
   * @returns {object[]}
   */
  function buildResponsesPayload() {
    return Object.entries(responses)
      .filter(([, row]) => row?.answer)
      .map(([itemId, row]) => ({
        itemId,
        itemCode: row.itemCode,
        answer: row.answer,
        details: row.details?.trim() || undefined,
      }))
  }

  /**
   * Saves current checklist as draft.
   * @returns {Promise<void>}
   */
  async function handleSaveDraft() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await saveReviewerChecklistDraft(submissionId, {
        responses: buildResponsesPayload(),
        generalNote: generalNote.trim() || undefined,
      })
      setNotice(t('reviewer.checklist.saved'))
    } catch {
      setError(t('reviewer.checklist.saveError'))
    } finally {
      setSaving(false)
    }
  }

  /**
   * Submits checklist review.
   * @returns {Promise<void>}
   */
  async function handleSubmit() {
    if (!recommendation) {
      setError(t('reviewer.checklist.recommendationRequired'))
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await submitReviewerChecklist(submissionId, {
        responses: buildResponsesPayload(),
        generalNote: generalNote.trim() || undefined,
        recommendation,
      })
      setNotice(t('reviewer.checklist.submitted'))
      onSuccess?.()
    } catch {
      setError(t('reviewer.checklist.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>
  }

  if (!template) {
    return <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{t('reviewer.checklist.noTemplate')}</p>
  }

  if (review?.status === 'SUBMITTED') {
    return <p className="text-sm" style={{ color: 'var(--status-success)' }}>{t('reviewer.checklist.alreadySubmitted')}</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--status-danger)', background: 'var(--status-danger-50)' }}>
          {error}
        </p>
      )}
      {notice && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--status-success)', background: 'var(--status-success-50)' }}>
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {sections.map((section) => (
            <Card key={section.id} as="section">
              <CardHeader
                title={section.title}
                subtitle={section.description || section.titleEn}
                actions={<Badge tone="navy">{t(`reviewer.checklist.answerType.${section.answerType}`)}</Badge>}
              />
              <CardBody className="space-y-3">
                {(section.items || []).filter((item) => stats.visibleIds.has(item.id)).map((item) => {
                  const row = responses[item.id] || { itemCode: item.code, answer: '', details: '' }
                  const showDetails = item.requiresDetails && NEGATIVE_ANSWERS.has(row.answer)
                  const options = getAnswerOptions(section.answerType, t)
                  return (
                    <div key={item.id} className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm m-0 font-medium">
                          {item.label}
                          {item.isRequired !== false ? <span style={{ color: 'var(--status-danger)' }}> *</span> : null}
                        </p>
                        {section.yesIsProblem && row.answer === 'YES' ? (
                          <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--status-warning)' }}>
                            <AlertTriangle size={14} aria-hidden />
                            {t('reviewer.checklist.flagged')}
                          </span>
                        ) : null}
                      </div>
                      <Select
                        value={row.answer}
                        onChange={(event) => handleAnswerChange(item.id, item.code, event.target.value)}
                        aria-label={item.label}
                      >
                        {options.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                      {showDetails ? (
                        <Textarea
                          rows={3}
                          value={row.details}
                          onChange={(event) => handleDetailsChange(item.id, event.target.value)}
                          placeholder={t('reviewer.checklist.detailsPlaceholder')}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          ))}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title={t('reviewer.checklist.summaryTitle')} />
            <CardBody className="space-y-3">
              <p className="text-sm m-0">
                {t('reviewer.checklist.requiredProgress', {
                  answered: stats.requiredAnswered,
                  total: stats.requiredTotal,
                })}
              </p>
              <Textarea
                rows={4}
                value={generalNote}
                onChange={(event) => setGeneralNote(event.target.value)}
                placeholder={t('reviewer.checklist.generalNotePlaceholder')}
              />
              <Select
                value={recommendation}
                onChange={(event) => setRecommendation(event.target.value)}
                aria-label={t('reviewer.checklist.recommendationLabel')}
              >
                <option value="">{t('reviewer.checklist.selectRecommendation')}</option>
                <option value="EXEMPT">{t('reviewer.checklist.recommendation.EXEMPT')}</option>
                <option value="APPROVED">{t('reviewer.checklist.recommendation.APPROVED')}</option>
                <option value="APPROVED_CONDITIONAL">{t('reviewer.checklist.recommendation.APPROVED_CONDITIONAL')}</option>
                <option value="REVISION_REQUIRED">{t('reviewer.checklist.recommendation.REVISION_REQUIRED')}</option>
                <option value="REJECTED">{t('reviewer.checklist.recommendation.REJECTED')}</option>
              </Select>
              <div className="grid grid-cols-1 gap-2">
                <Button type="button" variant="secondary" onClick={handleSaveDraft} loading={saving}>
                  {t('reviewer.checklist.saveDraft')}
                </Button>
                <Button type="button" onClick={handleSubmit} loading={submitting}>
                  {t('reviewer.checklist.submit')}
                </Button>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  )
}
