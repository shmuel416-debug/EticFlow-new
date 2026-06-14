/**
 * Ethic-Net — Submission Detail Page (Secretary / Chairman / Admin)
 * Full submission view with form answers, comments, status transitions, and reviewer assignment.
 * Role-conditioned: secretary sees assign+transition, chairman sees decision buttons.
 * Refreshed to Lev design system (PageHeader + Card primitives + Button).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Download, Eye, CheckCircle2, AlertCircle, MessageSquare, Trash2 } from 'lucide-react'
import api from '../../services/api'
import { getUserDisplayName } from '../../utils/userDisplayName'
import { useAuth } from '../../context/AuthContext'
import useStatusConfig from '../../hooks/useStatusConfig'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { buildEntityDocumentTitle } from '../../utils/documentTitle'
import { buildSubmissionDetailPath } from '../../utils/submissionRoutes'
import StatusBadge from '../../components/submissions/StatusBadge'
import CommentThread from '../../components/submissions/CommentThread'
import StatusTransitionPanel from '../../components/submissions/StatusTransitionPanel'
import ReviewerSelect from '../../components/submissions/ReviewerSelect'
import SubmissionLifecycle from '../../components/submissions/SubmissionLifecycle'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import FieldReviewSummary from '../../components/submissions/FieldReviewSummary'
import DocumentList from '../../components/submissions/DocumentList'
import AiPanel from '../../components/submissions/AiPanel'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Modal,
  FormField,
  Textarea,
} from '../../components/ui'

const APPROVAL_PDF_TIMEOUT_MS = 60000
const DECISION_LETTER_CONFIG = {
  APPROVED: {
    endpoint: 'approval-letter',
    filePrefix: 'approval-letter',
    viewHeKey: 'statusPage.viewPdf',
    viewEnKey: 'statusPage.viewPdfEn',
    downloadHeKey: 'statusPage.downloadPdf',
    downloadEnKey: 'statusPage.downloadPdfEn',
    progressKey: 'statusPage.pdfInProgress',
  },
  REJECTED: {
    endpoint: 'rejection-letter',
    filePrefix: 'rejection-letter',
    viewHeKey: 'statusPage.viewRejectPdf',
    viewEnKey: 'statusPage.viewRejectPdfEn',
    downloadHeKey: 'statusPage.downloadRejectPdf',
    downloadEnKey: 'statusPage.downloadRejectPdfEn',
    progressKey: 'statusPage.rejectionPdfInProgress',
  },
}

/**
 * Shared submission detail page for staff roles.
 * @returns {JSX.Element}
 */
export default function SubmissionDetailPage() {
  const { t, i18n }      = useTranslation()
  const { id: submissionRef } = useParams()
  const location         = useLocation()
  const navigate         = useNavigate()
  const { user } = useAuth()
  const [submission,     setSubmission]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [transitioning,  setTransitioning]  = useState(false)
  const [assigningId,    setAssigningId]    = useState('')
  const [assigningSecondaryId, setAssigningSecondaryId] = useState('')
  const [successMsg,     setSuccessMsg]     = useState('')
  const [pdfLoading,     setPdfLoading]     = useState(null) // 'download-he' | 'download-en' | 'preview-he' | 'preview-en' | null
  const [pdfFreshGeneration, setPdfFreshGeneration] = useState(false)
  const [previewPdfUrl,  setPreviewPdfUrl]  = useState('')
  const [previewOpen,    setPreviewOpen]    = useState(false)
  const [previousRound,  setPreviousRound]  = useState(null)
  const [deleteOpen,     setDeleteOpen]     = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')
  const [deleting,       setDeleting]       = useState(false)
  const resolvedSubmissionId = submission?.id || submissionRef
  const { statusMap }    = useStatusConfig({ submissionId: resolvedSubmissionId })
  const isAdmin = user?.roles?.includes('ADMIN') || user?.activeRole === 'ADMIN'

  const documentTitle = useMemo(
    () => buildEntityDocumentTitle(
      submission?.applicationId,
      submission?.title,
      t('submission.detail.pageTitle')
    ),
    [submission?.applicationId, submission?.title, t]
  )
  useDocumentTitle(documentTitle)

  /**
   * Resolves status label by locale with i18n fallback.
   * @param {string} statusCode
   * @returns {string}
   */
  function getStatusLabel(statusCode) {
    const statusMeta = statusMap[statusCode]
    const fromDb = i18n.language === 'he' ? statusMeta?.labelHe : statusMeta?.labelEn
    return t(`submission.status.${statusCode}`, fromDb || statusCode)
  }

  /**
   * Loads submission data from API.
   */
  const fetchSubmission = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/submissions/${submissionRef}`)
      setSubmission(data.submission)
      setAssigningId(data.submission.reviewerId ?? '')
      setAssigningSecondaryId(data.submission.secondaryReviewerId ?? '')
    } catch {
      setError(t('submission.detail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [submissionRef, t])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  useEffect(() => {
    if (!resolvedSubmissionId || !submission?.currentRound || submission.currentRound <= 1) {
      setPreviousRound(null)
      return
    }
    let cancelled = false
    api.get(`/submissions/${resolvedSubmissionId}/previous-round`)
      .then(({ data }) => {
        if (!cancelled) setPreviousRound(data.data)
      })
      .catch(() => {
        if (!cancelled) setPreviousRound(null)
      })
    return () => { cancelled = true }
  }, [resolvedSubmissionId, submission?.currentRound])

  useEffect(() => {
    if (!submission) return
    const canonicalPath = buildSubmissionDetailPath('/secretary/submissions', submission)
    if (!canonicalPath || location.pathname === canonicalPath) return
    navigate(canonicalPath, { replace: true, state: location.state })
  }, [location.pathname, location.state, navigate, submission])

  useEffect(() => {
    return () => {
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl)
    }
  }, [previewPdfUrl])

  /**
   * Requests decision-letter PDF bytes from API.
   * @param {'he'|'en'} lang
   * @returns {Promise<Blob>}
   */
  async function requestDecisionPdfBlob(lang) {
    const decisionLetter = DECISION_LETTER_CONFIG[submission?.status] ?? null
    if (!decisionLetter) throw new Error('Decision letter is not available')
    const response = await api.post(
      `/submissions/${resolvedSubmissionId}/${decisionLetter.endpoint}?lang=${lang}`,
      {},
      { responseType: 'blob', timeout: APPROVAL_PDF_TIMEOUT_MS }
    )
    const cached = String(response.headers['x-generated'] || '').toLowerCase() === 'cached'
    setPdfFreshGeneration(!cached)
    return new Blob([response.data], { type: 'application/pdf' })
  }

  /**
   * Handles status transition action.
   * @param {string} newStatus
   */
  async function handleTransition(newStatus) {
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${resolvedSubmissionId}/status`, { status: newStatus })
      setSuccessMsg(t('submission.detail.statusUpdatedTo', { status: getStatusLabel(newStatus) }))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
    }
  }

  /**
   * Pre-fills reviewer selectors from the previous review round.
   * @param {'primary'|'secondary'} role
   * @returns {void}
   */
  function handleReassignFromPrevious(role) {
    if (!previousRound) return
    if (role === 'primary' && previousRound.primaryReviewer?.id) {
      setAssigningId(previousRound.primaryReviewer.id)
    }
    if (role === 'secondary' && previousRound.secondaryReviewer?.id) {
      setAssigningSecondaryId(previousRound.secondaryReviewer.id)
    }
  }

  /**
   * Handles reviewer assignment.
   */
  async function handleAssign() {
    if (!assigningId) return
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${resolvedSubmissionId}/assign`, { reviewerId: assigningId })
      setSuccessMsg(t('submission.detail.reviewerAssigned'))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
    }
  }

  /**
   * Handles secondary reviewer assignment.
   */
  async function handleAssignSecondary() {
    if (!assigningSecondaryId) return
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${resolvedSubmissionId}/assign-secondary`, { reviewerId: assigningSecondaryId })
      setSuccessMsg(t('submission.detail.secondaryReviewerAssigned'))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
    }
  }

  /**
   * Adds a comment via API.
   * @param {string} content
   * @param {boolean} isInternal
   */
  async function handleAddComment(content, isInternal) {
    await api.post(`/submissions/${resolvedSubmissionId}/comments`, { content, isInternal })
    await fetchSubmission()
  }

  /**
   * Permanently deletes the submission (ADMIN only).
   * @returns {Promise<void>}
   */
  async function handlePermanentDelete() {
    if (deleteConfirm.trim() !== submission?.applicationId) return
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/submissions/${resolvedSubmissionId}`)
      setDeleteOpen(false)
      setDeleteConfirm('')
      navigate('/secretary/submissions', {
        state: { statusMessage: t('submission.detail.permanentDeleteSuccess') },
      })
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setDeleting(false)
    }
  }

  /**
   * Generates and downloads the approval letter PDF.
   * @param {'he'|'en'} lang
   */
  async function handleDownloadPdf(lang) {
    setPdfLoading(`download-${lang}`)
    try {
      const decisionLetter = DECISION_LETTER_CONFIG[submission?.status] ?? null
      const blob = await requestDecisionPdfBlob(lang)
      const url  = URL.createObjectURL(blob)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        const link = document.createElement('a')
        link.href     = url
        link.download = `${decisionLetter?.filePrefix || 'decision-letter'}-${lang}-${submission.applicationId}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      }
    } catch {
      setError(t('statusPage.pdfError'))
    } finally {
      setPdfLoading(null)
    }
  }

  /**
   * Opens approval-letter PDF in preview modal without downloading.
   * @param {'he'|'en'} lang
   * @returns {Promise<void>}
   */
  async function handlePreviewPdf(lang) {
    setPdfLoading(`preview-${lang}`)
    try {
      const blob = await requestDecisionPdfBlob(lang)
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl)
      const nextUrl = URL.createObjectURL(blob)
      setPreviewPdfUrl(nextUrl)
      setPreviewOpen(true)
    } catch {
      setError(t('statusPage.pdfError'))
    } finally {
      setPdfLoading(null)
    }
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
  if (error && !submission) {
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

  const latestVersion = submission?.versions?.slice(-1)[0]
  const canAssign     =
    ['SECRETARY','ADMIN'].includes(user?.role) &&
    ['IN_TRIAGE','ASSIGNED'].includes(submission?.status)
  const canAssignSecondary =
    ['SECRETARY','ADMIN'].includes(user?.role) &&
    ['ASSIGNED','ASSIGNED_SECONDARY'].includes(submission?.status) &&
    Boolean(submission?.reviewerId)
  const isPdfBusy = pdfLoading !== null
  const decisionLetter = DECISION_LETTER_CONFIG[submission?.status] ?? null
  const backTo        =
    typeof location.state?.from === 'string'
      ? location.state.from
      : '/secretary/submissions'

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
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
            userRole={user?.role || 'SECRETARY'}
            variant="full"
          />
        </CardBody>
      </Card>

      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{
            background: 'var(--status-success-50)',
            color: 'var(--status-success)',
            border: '1px solid var(--status-success)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
          }}
        >
          <CheckCircle2
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
          />
          {successMsg}
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
          }}
        >
          <AlertCircle
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
          />
          {error}
        </div>
      )}

      {/* Decision letter download — available for approved/rejected */}
      {decisionLetter && (
        <Card>
          <CardHeader
            title={submission?.status === 'REJECTED'
              ? t('statusPage.decisionLetterRejectedTitle')
              : t('statusPage.decisionLetterTitle')}
          />
          <CardBody>
            <p
              className="text-sm mb-3 flex items-center gap-2"
              style={{ color: 'var(--status-success)' }}
              role="status"
            >
              <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />
              {t('statusPage.decisionLetterReady')}
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => handlePreviewPdf('he')}
                disabled={isPdfBusy}
                aria-label={t(decisionLetter.viewHeKey)}
                title={t(decisionLetter.viewHeKey)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--lev-teal-50)]"
                style={{ color: 'var(--lev-navy)' }}
              >
                {pdfLoading === 'preview-he'
                  ? <Spinner size={16} label={t(decisionLetter.progressKey)} />
                  : <Eye size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              </button>
              <Button
                variant="primary"
                onClick={() => handleDownloadPdf('he')}
                disabled={isPdfBusy}
                loading={pdfLoading === 'download-he'}
                leftIcon={
                  <Download
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
              >
                {t(decisionLetter.downloadHeKey)}
              </Button>
              <button
                type="button"
                onClick={() => handlePreviewPdf('en')}
                disabled={isPdfBusy}
                aria-label={t(decisionLetter.viewEnKey)}
                title={t(decisionLetter.viewEnKey)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--lev-teal-50)]"
                style={{ color: 'var(--lev-navy)' }}
              >
                {pdfLoading === 'preview-en'
                  ? <Spinner size={16} label={t(decisionLetter.progressKey)} />
                  : <Eye size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
              </button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadPdf('en')}
                disabled={isPdfBusy}
                loading={pdfLoading === 'download-en'}
                leftIcon={
                  <Download
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
              >
                {t(decisionLetter.downloadEnKey)}
              </Button>
            </div>
            {isPdfBusy && pdfFreshGeneration ? (
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Spinner size={14} label={t(decisionLetter?.progressKey || 'statusPage.pdfInProgress')} />
                <span>{t(decisionLetter?.progressKey || 'statusPage.pdfInProgress')}</span>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card as="section">
            <CardHeader title={t('submission.detail.sectionAnswers')} />
            <CardBody>
              <FormAnswersViewer
                formConfig={submission?.formConfig}
                dataJson={latestVersion?.dataJson ?? {}}
              />
            </CardBody>
          </Card>

          <Card as="section">
            <CardHeader title={t('submission.fieldReviews.sectionTitle')} />
            <CardBody>
              <FieldReviewSummary submissionId={resolvedSubmissionId} />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card as="section">
            <CardHeader title={t('submission.detail.sectionStatus')} />
            <CardBody>
              <StatusTransitionPanel
                currentStatus={submission?.status}
                userRole={user?.role}
                submissionId={submission?.id}
                onTransition={handleTransition}
                loading={transitioning}
              />
            </CardBody>
          </Card>

          {canAssign && previousRound && (
            <Card as="section">
              <CardHeader title={t('submission.detail.previousRoundTitle')} />
              <CardBody className="space-y-3">
                {previousRound.primaryReviewer ? (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('submission.detail.previousRoundPrimary')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {getUserDisplayName(previousRound.primaryReviewer, i18n.language)}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleReassignFromPrevious('primary')}
                    >
                      {t('submission.detail.reassignPrimary')}
                    </Button>
                  </div>
                ) : null}
                {previousRound.secondaryReviewer ? (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('submission.detail.previousRoundSecondary')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {getUserDisplayName(previousRound.secondaryReviewer, i18n.language)}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleReassignFromPrevious('secondary')}
                    >
                      {t('submission.detail.reassignSecondary')}
                    </Button>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          )}

          {canAssign && (
            <Card as="section">
              <CardHeader title={t('submission.detail.sectionReviewer')} />
              <CardBody>
                <ReviewerSelect
                  value={assigningId}
                  onChange={setAssigningId}
                  submissionId={submission?.id}
                  disabled={transitioning}
                />
                <Button
                  variant="gold"
                  fullWidth
                  className="mt-3"
                  onClick={handleAssign}
                  data-testid="assign-reviewer-submit"
                  disabled={transitioning || !assigningId}
                  loading={transitioning && !!assigningId}
                >
                  {t('submission.detail.assignReviewer')}
                </Button>
              </CardBody>
            </Card>
          )}

          {submission?.reviewer && (
            <Card as="section">
              <CardHeader title={t('submission.detail.sectionReviewer')} />
              <CardBody>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {getUserDisplayName(submission.reviewer, i18n.language)}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {submission.reviewer.email}
                </p>
              </CardBody>
            </Card>
          )}

          {canAssignSecondary && (
            <Card as="section">
              <CardHeader title={t('submission.detail.sectionSecondaryReviewer')} />
              <CardBody>
                <ReviewerSelect
                  value={assigningSecondaryId}
                  onChange={setAssigningSecondaryId}
                  submissionId={submission?.id}
                  disabled={transitioning}
                />
                <Button
                  variant="gold"
                  fullWidth
                  className="mt-3"
                  onClick={handleAssignSecondary}
                  data-testid="assign-secondary-reviewer-submit"
                  disabled={transitioning || !assigningSecondaryId || assigningSecondaryId === submission?.reviewerId}
                  loading={transitioning && !!assigningSecondaryId}
                >
                  {t('submission.detail.assignSecondaryReviewer')}
                </Button>
              </CardBody>
            </Card>
          )}

          {submission?.secondaryReviewer && (
            <Card as="section">
              <CardHeader title={t('submission.detail.sectionSecondaryReviewer')} />
              <CardBody>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {getUserDisplayName(submission.secondaryReviewer, i18n.language)}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {submission.secondaryReviewer.email}
                </p>
              </CardBody>
            </Card>
          )}

          <AiPanel submissionId={submission.id} canRun />
        </aside>
      </div>

      <Card as="section">
        <CardHeader title={t('documents.sectionTitle')} />
        <CardBody>
          <DocumentList submissionId={submission.id} canUpload />
        </CardBody>
      </Card>

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
          <CommentThread
            comments={submission?.comments ?? []}
            onAdd={handleAddComment}
          />
        </CardBody>
      </Card>

      {isAdmin && (
        <Card as="section">
          <CardHeader title={t('submission.detail.permanentDeleteTitle')} />
          <CardBody>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {t('submission.detail.permanentDeleteConfirm')}
            </p>
            <Button
              variant="danger"
              onClick={() => setDeleteOpen(true)}
              leftIcon={
                <Trash2
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                />
              }
            >
              {t('submission.detail.permanentDelete')}
            </Button>
          </CardBody>
        </Card>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('documents.previewTitle')}
        description={submission?.applicationId || ''}
        size="lg"
        closeLabel={t('documents.closePreviewLabel')}
      >
        {previewPdfUrl && (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <iframe
              title={t('documents.previewFrameLabel', { name: submission?.applicationId || '' })}
              src={previewPdfUrl}
              className="w-full h-[70vh]"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title={t('submission.detail.permanentDeleteTitle')}
        description={t('submission.detail.permanentDeleteConfirm')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              {t('common.cancel', 'ביטול')}
            </Button>
            <Button
              variant="danger"
              onClick={handlePermanentDelete}
              loading={deleting}
              disabled={deleteConfirm.trim() !== submission?.applicationId}
              leftIcon={
                <Trash2
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                />
              }
            >
              {t('submission.detail.permanentDelete')}
            </Button>
          </>
        }
      >
        <FormField
          label={t('submission.detail.permanentDeleteHint', {
            applicationId: submission?.applicationId || '',
          })}
          render={({ inputId, describedBy, required, invalid }) => (
            <Textarea
              id={inputId}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              aria-required={required || undefined}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={2}
            />
          )}
        />
      </Modal>
    </main>
  )
}
