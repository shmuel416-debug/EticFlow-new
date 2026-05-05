/**
 * EthicFlow — Reviewer Review Detail Page
 * Shows form answers + comments for the reviewer, with checklist renderer.
 * Refreshed to Lev design system (PageHeader + Card primitives + Button).
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, ArrowRight, ArrowLeft, MessageSquare } from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import SubmissionLifecycle from '../../components/submissions/SubmissionLifecycle'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import CommentThread from '../../components/submissions/CommentThread'
import ChecklistRenderer from '../../components/submissions/ChecklistRenderer'
import AiPanel from '../../components/submissions/AiPanel'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Spinner,
} from '../../components/ui'

/**
 * Reviewer's detail page — read-only form answers + checklist renderer.
 * @returns {JSX.Element}
 */
export default function ReviewDetailPage() {
  const { t, i18n }  = useTranslation()
  const { id }       = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const isRtl        = i18n.dir() === 'rtl'
  const DiffArrow    = isRtl ? ArrowLeft : ArrowRight
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const backTo       =
    typeof location.state?.from === 'string'
      ? location.state.from
      : '/reviewer/assignments'

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
    navigate(backTo)
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-3 p-8"
        role="status"
        aria-live="polite"
      >
        <Spinner size={20} label={t('common.loading')} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('common.loading')}
        </p>
      </div>
    )
  }
  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="p-8 text-center text-sm font-medium"
        style={{ color: 'var(--status-danger)' }}
      >
        {error}
      </div>
    )
  }

  const latestVersion   = submission?.versions?.slice(-1)[0]
  const alreadyReviewed = submission?.status !== 'ASSIGNED'

  const diffLink = (
    <Link
      to={`/reviewer/assignments/${id}/diff`}
      state={{ from: `${location.pathname}${location.search}` }}
      data-testid="open-review-diff"
      className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
      style={{
        color: 'var(--lev-teal-text)',
        minHeight: 40,
        padding: '0 10px',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <Eye
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        focusable="false"
      />
      <span>{t('reviewer.diff.openDiff')}</span>
      <DiffArrow
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        focusable="false"
      />
    </Link>
  )

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {diffLink}
      <span
        className="text-xs font-mono"
        style={{ color: 'var(--text-muted)' }}
      >
        {submission?.applicationId}
      </span>
      <StatusBadge status={submission?.status} />
    </div>
  )

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={submission?.title}
        subtitle={submission?.applicationId}
        backTo={backTo}
        backLabel={t('submission.detail.backToList')}
        actions={headerActions}
      />

      <Card as="section">
        <CardHeader title={t('submissionLifecycle.sectionTitle')} />
        <CardBody>
          <SubmissionLifecycle
            submissionId={submission?.id}
            currentStatus={submission?.status}
            reviewer={submission?.reviewer}
            userRole="REVIEWER"
            variant="full"
          />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card as="section" className="lg:col-span-2">
          <CardHeader title={t('submission.detail.sectionAnswers')} />
          <CardBody>
            <FormAnswersViewer
              formConfig={submission?.formConfig}
              dataJson={latestVersion?.dataJson ?? {}}
            />
          </CardBody>
        </Card>

        <aside className="space-y-5">
          <AiPanel submissionId={id} canRun={!alreadyReviewed} />

          <Card as="section">
            <CardHeader title={t('reviewer.checklist.panelTitle')} />
            <CardBody>
              {alreadyReviewed ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('reviewer.checklist.alreadySubmitted')}
                </p>
              ) : (
                <ChecklistRenderer submissionId={id} onSuccess={handleReviewSuccess} />
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <Card as="section">
        <CardHeader
          title={t('submission.detail.sectionComments')}
          actions={
            <MessageSquare
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
              focusable="false"
              style={{ color: 'var(--text-muted)' }}
            />
          }
        />
        <CardBody>
          <CommentThread comments={submission?.comments ?? []} onAdd={null} />
        </CardBody>
      </Card>
    </main>
  )
}
