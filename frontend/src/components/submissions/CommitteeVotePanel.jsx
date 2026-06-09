/**
 * Ethic-Net — Committee Vote Panel
 * Shows vote tally and allows committee members to cast/update a vote.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  Card,
  CardHeader,
  CardBody,
  FormField,
  Select,
  Textarea,
  Button,
  Spinner,
} from '../ui'

/**
 * Vote editor and tally widget for a submission.
 * @param {{
 *   submissionId?: string,
 *   canVote?: boolean,
 *   titleKey?: string,
 *   onSummaryChange?: (summary: object) => void
 * }} props
 * @returns {JSX.Element | null}
 */
export default function CommitteeVotePanel({
  submissionId,
  canVote = true,
  titleKey = 'reviewer.committeeVote.title',
  onSummaryChange,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [decision, setDecision] = useState('')
  const [note, setNote] = useState('')

  /**
   * Loads latest committee votes and tally from API.
   * @returns {Promise<void>}
   */
  const loadVotes = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    setError('')
    try {
      const response = await api.get(`/submissions/${submissionId}/votes`)
      const payload = response?.data?.data
      const incomingSummary = payload?.summary || null
      const votes = Array.isArray(payload?.votes) ? payload.votes : []
      const myVote = votes.find((vote) => vote.voterId === user?.id)
      setSummary(incomingSummary)
      setDecision(myVote?.decision || '')
      setNote(myVote?.note || '')
      onSummaryChange?.(incomingSummary || {})
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setLoading(false)
    }
  }, [onSummaryChange, submissionId, t, user?.id])

  useEffect(() => {
    loadVotes()
  }, [loadVotes])

  /**
   * Sends the current vote decision to the backend.
   * @returns {Promise<void>}
   */
  async function handleSubmitVote() {
    if (!submissionId || !decision) return
    setSaving(true)
    setError('')
    try {
      await api.post(`/submissions/${submissionId}/votes`, {
        decision,
        note: note.trim() || undefined,
      })
      await loadVotes()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setSaving(false)
    }
  }

  const tallyRows = useMemo(() => ([
    { key: 'approved', label: t('reviewer.committeeVote.tally.approved') },
    { key: 'rejected', label: t('reviewer.committeeVote.tally.rejected') },
    { key: 'revisionRequired', label: t('reviewer.committeeVote.tally.revisionRequired') },
    { key: 'abstain', label: t('reviewer.committeeVote.tally.abstain') },
    { key: 'total', label: t('reviewer.committeeVote.tally.total') },
  ]), [t])

  if (!submissionId) return null

  return (
    <Card as="section">
      <CardHeader title={t(titleKey)} />
      <CardBody>
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Spinner size={16} label={t('common.loading')} />
            <span>{t('common.loading')}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2" aria-live="polite">
                {tallyRows.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border p-2"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {item.label}
                    </p>
                    <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {summary[item.key] ?? 0}
                    </p>
                  </div>
                ))}
                <div
                  className="rounded-lg border p-2 col-span-2 md:col-span-3"
                  style={{ borderColor: summary.quorumMet ? 'var(--status-success)' : 'var(--status-warning)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {t('reviewer.committeeVote.quorumLabel')}
                  </p>
                  <p className="text-base font-semibold">
                    {t('reviewer.committeeVote.quorumValue', {
                      total: summary.total ?? 0,
                      quorum: summary.quorum ?? 0,
                    })}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm font-medium" style={{ color: 'var(--status-danger)' }}>
                {error}
              </p>
            )}

            {canVote && (
              <div className="space-y-3">
                <FormField
                  label={t('reviewer.committeeVote.decisionLabel')}
                  render={({ inputId, describedBy }) => (
                    <Select
                      id={inputId}
                      value={decision}
                      onChange={(event) => setDecision(event.target.value)}
                      aria-describedby={describedBy}
                    >
                      <option value="">{t('reviewer.committeeVote.selectDecision')}</option>
                      <option value="APPROVED">{t('reviewer.committeeVote.options.APPROVED')}</option>
                      <option value="REJECTED">{t('reviewer.committeeVote.options.REJECTED')}</option>
                      <option value="REVISION_REQUIRED">{t('reviewer.committeeVote.options.REVISION_REQUIRED')}</option>
                      <option value="ABSTAIN">{t('reviewer.committeeVote.options.ABSTAIN')}</option>
                    </Select>
                  )}
                />

                <FormField
                  label={t('reviewer.committeeVote.noteLabel')}
                  render={({ inputId, describedBy }) => (
                    <Textarea
                      id={inputId}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder={t('reviewer.committeeVote.notePlaceholder')}
                      aria-describedby={describedBy}
                      rows={3}
                    />
                  )}
                />

                <Button
                  variant="secondary"
                  onClick={handleSubmitVote}
                  disabled={!decision}
                  loading={saving}
                >
                  {t('reviewer.committeeVote.submit')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
