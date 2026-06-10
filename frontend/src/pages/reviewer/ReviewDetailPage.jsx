/**
 * Ethic-Net — Reviewer Review Detail Page
 * Shows form answers + comments for the reviewer, with checklist renderer.
 * Refreshed to Lev design system (PageHeader + Card primitives + Button).
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, ArrowRight, ArrowLeft, MessageSquare } from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import SubmissionLifecycle from '../../components/submissions/SubmissionLifecycle'
import CommentThread from '../../components/submissions/CommentThread'
import FieldReviewGrid from '../../components/submissions/FieldReviewGrid'
import FieldReviewSummary from '../../components/submissions/FieldReviewSummary'
import AiPanel from '../../components/submissions/AiPanel'
import CommitteeVotePanel from '../../components/submissions/CommitteeVotePanel'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Spinner,
} from '../../components/ui'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { buildEntityDocumentTitle } from '../../utils/documentTitle'
import {
  buildSubmissionDetailPath,
  getSubmissionPublicRef,
  slugifySubmissionTitle,
} from '../../utils/submissionRoutes'

/**
 * Reviewer's detail page — dynamic per-question review grid.
 * @returns {JSX.Element}
 */
export default function ReviewDetailPage() {
  const { t, i18n }  = useTranslation()
  const { id: submissionRef } = useParams()
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

  const documentTitle = useMemo(
    () => buildEntityDocumentTitle(
      submission?.applicationId,
      submission?.title,
      t('reviewer.assignments.pageTitle')
    ),
    [submission?.applicationId, submission?.title, t]
  )
  useDocumentTitle(documentTitle)

  /**
   * Loads submission data.
   */
  const fetchSubmission = useCallback(async () => {
    try {
      const { data } = await api.get(`/submissions/${submissionRef}`)
      setSubmission(data.submission)
    } catch {
      setError(t('submission.detail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [submissionRef, t])

  useEffect(() => {
    if (!submission) return
    const canonicalPath = buildSubmissionDetailPath('/reviewer/assignments', submission)
    if (!canonicalPath || location.pathname === canonicalPath) return
    navigate(canonicalPath, { replace: true, state: location.state })
  }, [location.pathname, location.state, navigate, submission])

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

  const diffPath = (() => {
    const ref = encodeURIComponent(getSubmissionPublicRef(submission))
    const slug = slugifySubmissionTitle(submission?.title)
    return slug
      ? `/reviewer/assignments/${ref}/diff/${encodeURIComponent(slug)}`
      : `/reviewer/assignments/${ref}/diff`
  })()

  const diffLink = (
    <Link
      to={diffPath}
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

      <Card as="section">
        <CardHeader title={t('reviewer.fieldReview.panelTitle')} />
        <CardBody>
          <AiPanel submissionId={submission?.id} canRun={['ASSIGNED', 'ASSIGNED_SECONDARY'].includes(submission?.status)} />
        </CardBody>
      </Card>

      <FieldReviewGrid submissionId={submission?.id} onSuccess={handleReviewSuccess} />

      {/* Peer reviews: all committee members can see reviewer 1 & 2's submitted reviews. */}
      <FieldReviewSummary submissionId={submission?.id} />

      <CommitteeVotePanel
        submissionId={submission?.id}
        canVote={submission?.status === 'IN_REVIEW' || submission?.status === 'PENDING_REVISION'}
      />

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
