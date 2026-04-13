/**
 * EthicFlow — Reviewer Review Detail Page
 * Shows form answers + comments for the reviewer, with ReviewForm to submit evaluation.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import CommentThread from '../../components/submissions/CommentThread'
import ReviewForm from '../../components/submissions/ReviewForm'

/**
 * Reviewer's detail page — read-only form answers + ReviewForm.
 */
export default function ReviewDetailPage() {
  const { t }        = useTranslation()
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')

  /**
   * Loads submission data.
   */
  const fetchSubmission = useCallback(async () => {
    try {
      const { data } = await api.get(`/submissions/${id}`)
      setSubmission(data.submission)
    } catch {
      setError(t('submission.detail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  /** Navigates back to assignments after successful review. */
  function handleReviewSuccess() {
    navigate('/reviewer/assignments')
  }

  if (loading) return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
  if (error)   return <div className="p-8 text-center text-red-600" role="alert">{error}</div>

  const latestVersion = submission?.versions?.slice(-1)[0]
  const alreadyReviewed = submission?.status !== 'ASSIGNED'

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/reviewer/assignments" className="text-sm hover:underline mb-2 inline-flex items-center gap-1"
          style={{ color: 'var(--lev-navy)' }}>
          ← {t('submission.detail.backToList')}
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{submission?.title}</h1>
          <StatusBadge status={submission?.status} />
          <span className="text-sm text-gray-500 font-mono">{submission?.applicationId}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form answers */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
            {t('submission.detail.sectionAnswers')}
          </h2>
          <FormAnswersViewer formConfig={submission?.formConfig} dataJson={latestVersion?.dataJson ?? {}} />
        </section>

        {/* Review form */}
        <aside>
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
              {t('reviewer.review.pageTitle')}
            </h2>
            {alreadyReviewed
              ? <p className="text-sm text-gray-500">{t('reviewer.review.submitSuccess')}</p>
              : <ReviewForm submissionId={id} onSuccess={handleReviewSuccess} />
            }
          </section>
        </aside>
      </div>

      {/* Comments */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.detail.sectionComments')}
        </h2>
        <CommentThread comments={submission?.comments ?? []} onAdd={null} />
      </section>
    </main>
  )
}
