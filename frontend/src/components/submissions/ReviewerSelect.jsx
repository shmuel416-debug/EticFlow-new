/**
 * EthicFlow — ReviewerSelect Component
 * Async-loaded dropdown of active REVIEWER users.
 * Used by secretary on SubmissionDetailPage to assign a reviewer.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/**
 * @param {{
 *   value: string,
 *   onChange: (reviewerId: string) => void,
 *   submissionId?: string,
 *   disabled?: boolean
 * }} props
 */
export default function ReviewerSelect({ value, onChange, submissionId, disabled = false }) {
  const { t }       = useTranslation()
  const [reviewers, setReviewers] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    /** Fetches active reviewers from the API. */
    async function fetchReviewers() {
      try {
        const query = submissionId ? `?submissionId=${encodeURIComponent(submissionId)}` : ''
        const { data } = await api.get(`/users/reviewers${query}`)
        setReviewers(data.data ?? [])
      } catch {
        setReviewers([])
      } finally {
        setLoading(false)
      }
    }
    fetchReviewers()
  }, [submissionId])

  return (
    <div className="space-y-1">
      <label htmlFor="reviewer-select" className="block text-sm font-medium text-gray-700">
        {t('submission.detail.assignReviewer')}
      </label>
      <select
        id="reviewer-select"
        data-testid="reviewer-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
        style={{ minHeight: '44px' }}
        aria-label={t('submission.detail.assignReviewer')}
      >
        <option value="">{loading ? t('common.loading') : t('submission.detail.noReviewer')}</option>
        {reviewers.map((r) => (
          <option
            key={r.id}
            value={r.id}
            disabled={r.hasConflict}
            title={r.hasConflict ? (r.conflictReasons?.[0]?.message || t('errors.COI_BLOCKED')) : undefined}
          >
            {r.fullName}{r.hasConflict ? ` — ${t('coi.blockedReviewer')}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
