/**
 * EthicFlow — ReviewForm Component
 * Reviewer's structured form: score 1-5, recommendation radio, comments textarea.
 * IS 5568: fieldset + legend on radio group, aria-required, min touch targets.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const RECOMMENDATIONS = ['APPROVED', 'REJECTED', 'REVISION_REQUIRED']

/**
 * @param {{ submissionId: string, onSuccess: () => void }} props
 */
export default function ReviewForm({ submissionId, onSuccess }) {
  const { t }           = useTranslation()
  const [score,         setScore]         = useState(3)
  const [recommendation,setRecommendation] = useState('')
  const [comments,      setComments]      = useState('')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  /**
   * Submits the review to the API.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!recommendation) { setError(t('errors.VALIDATION_ERROR')); return }
    if (comments.trim().length < 10) { setError(t('errors.VALIDATION_ERROR')); return }

    setSaving(true)
    setError('')
    try {
      await api.patch(`/submissions/${submissionId}/review`, {
        score: Number(score),
        recommendation,
        comments: comments.trim(),
      })
      onSuccess?.()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Score */}
      <div>
        <label htmlFor="review-score" className="block text-sm font-medium text-gray-700 mb-1">
          {t('reviewer.review.scoreLabel')}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="review-score"
            type="range"
            data-testid="review-score"
            min={1} max={5}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="flex-1"
            aria-valuemin={1} aria-valuemax={5} aria-valuenow={score}
          />
          <span className="text-lg font-bold w-6 text-center" style={{ color: 'var(--lev-navy)' }}>{score}</span>
        </div>
      </div>

      {/* Recommendation */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2" aria-required="true">
          {t('reviewer.review.recommendLabel')} *
        </legend>
        <div className="space-y-2">
          {RECOMMENDATIONS.map((rec) => (
            <label key={rec} className="flex items-center gap-3 cursor-pointer" style={{ minHeight: '44px' }}>
              <input
                type="radio"
                name="recommendation"
                value={rec}
                data-testid={`review-recommendation-${rec}`}
                checked={recommendation === rec}
                onChange={() => setRecommendation(rec)}
                className="w-4 h-4"
                aria-required="true"
              />
              <span className="text-sm text-gray-700">{t(`reviewer.review.rec_${rec.replace('_REQUIRED','')}`)} </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Comments */}
      <div>
        <label htmlFor="review-comments" className="block text-sm font-medium text-gray-700 mb-1">
          {t('reviewer.review.commentsLabel')} *
        </label>
        <textarea
          id="review-comments"
          data-testid="review-comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={t('reviewer.review.commentsHint')}
          rows={5}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
          aria-required="true"
          aria-describedby="comments-hint"
        />
        <p id="comments-hint" className="text-xs text-gray-500 mt-1">{t('reviewer.review.commentsHint')}</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        data-testid="review-submit"
        disabled={saving}
        className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
        style={{ background: 'var(--lev-navy)', minHeight: '44px' }}
      >
        {saving ? t('reviewer.review.submitting') : t('reviewer.review.submitReview')}
      </button>
    </form>
  )
}
