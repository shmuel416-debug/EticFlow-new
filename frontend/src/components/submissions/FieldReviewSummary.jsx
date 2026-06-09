/**
 * Ethic-Net — FieldReviewSummary
 * Read-only staff view of per-field reviewer comments for a submission.
 */

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { Badge, Card, CardBody, CardHeader, Spinner, Table } from '../ui'

/**
 * Resolves a localized field label from schema metadata.
 * @param {object} field
 * @param {string} lang
 * @returns {string}
 */
function resolveFieldLabel(field, lang) {
  if (!field) return ''
  if (lang === 'he') return field.label || field.labelHe || field.labelEn || field.id || field.key || ''
  return field.labelEn || field.label || field.id || field.key || ''
}

/**
 * @param {{ submissionId: string }} props
 * @returns {JSX.Element|null}
 */
export default function FieldReviewSummary({ submissionId }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fields, setFields] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!submissionId) return undefined
    let cancelled = false

    /**
     * Loads staff-visible reviewer reviews for the submission.
     * @returns {Promise<void>}
     */
    async function loadReviews() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/submissions/${submissionId}/reviews`)
        if (cancelled) return
        setFields(data.data?.fields ?? [])
        setReviews(data.data?.reviews ?? [])
      } catch {
        if (!cancelled) setError(t('submission.fieldReviews.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReviews()
    return () => { cancelled = true }
  }, [submissionId, t])

  const fieldLabelByKey = useMemo(() => {
    const lang = i18n.language?.startsWith('he') ? 'he' : 'en'
    return fields.reduce((acc, field) => {
      const key = field.id || field.key
      if (key) acc[key] = resolveFieldLabel(field, lang)
      return acc
    }, {})
  }, [fields, i18n.language])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Spinner size={18} label={t('common.loading')} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-sm" style={{ color: 'var(--status-danger)' }}>
        {error}
      </p>
    )
  }

  if (!reviews.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('submission.fieldReviews.empty')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const rows = (review.fieldResponses ?? []).filter((row) => row.status)
        const statusTone = review.status === 'SUBMITTED' ? 'success' : 'neutral'
        return (
          <Card key={review.id} as="section">
            <CardHeader
              title={review.reviewer?.fullName || t('submission.fieldReviews.reviewer')}
              subtitle={review.reviewer?.email}
              actions={
                <Badge tone={statusTone} size="sm">
                  {review.status === 'SUBMITTED'
                    ? t('submission.fieldReviews.submitted')
                    : t('submission.fieldReviews.draft')}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              {review.recommendation ? (
                <p className="text-sm">
                  <span className="font-semibold">{t('submission.fieldReviews.recommendation')}: </span>
                  {t(`reviewer.fieldReview.recommendation.${review.recommendation}`, review.recommendation)}
                </p>
              ) : null}
              {review.generalNote ? (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">{t('submission.fieldReviews.generalNote')}: </span>
                  {review.generalNote}
                </p>
              ) : null}
              {review.impression ? (
                <p className="text-sm whitespace-pre-wrap">
                  <span className="font-semibold">{t('submission.fieldReviews.impression')}: </span>
                  {review.impression}
                </p>
              ) : null}

              {rows.length > 0 ? (
                <Table
                  caption={t('submission.fieldReviews.sectionTitle')}
                  columns={[
                    {
                      key: 'field',
                      header: t('submission.fieldReviews.field'),
                      render: (row) => fieldLabelByKey[row.fieldKey] || row.fieldKey,
                    },
                    {
                      key: 'status',
                      header: t('submission.fieldReviews.status'),
                      render: (row) => (
                        <Badge
                          tone={row.status === 'INVALID' ? 'danger' : row.status === 'VALID' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {t(`reviewer.fieldReview.status.${row.status}`, row.status)}
                        </Badge>
                      ),
                    },
                    {
                      key: 'comment',
                      header: t('submission.fieldReviews.comment'),
                      render: (row) => (
                        <span className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                          {row.comment?.trim() || t('submission.fieldReviews.noComment')}
                        </span>
                      ),
                    },
                  ]}
                  rows={rows}
                  rowKey={(row) => `${review.id}-${row.fieldKey}`}
                  emptyTitle={t('submission.fieldReviews.empty')}
                />
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('submission.fieldReviews.empty')}
                </p>
              )}
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
