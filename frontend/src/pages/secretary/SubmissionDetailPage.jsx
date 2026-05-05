/**
 * EthicFlow — Submission Detail Page (Secretary / Chairman / Admin)
 * Full submission view with form answers, comments, status transitions, and reviewer assignment.
 * Role-conditioned: secretary sees assign+transition, chairman sees decision buttons.
 * Refreshed to Lev design system (PageHeader + Card primitives + Button).
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useLocation } from 'react-router-dom'
import { Download, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import useStatusConfig from '../../hooks/useStatusConfig'
import StatusBadge from '../../components/submissions/StatusBadge'
import CommentThread from '../../components/submissions/CommentThread'
import StatusTransitionPanel from '../../components/submissions/StatusTransitionPanel'
import ReviewerSelect from '../../components/submissions/ReviewerSelect'
import SubmissionLifecycle from '../../components/submissions/SubmissionLifecycle'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import DocumentList from '../../components/submissions/DocumentList'
import AiPanel from '../../components/submissions/AiPanel'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
} from '../../components/ui'

/**
 * Shared submission detail page for staff roles.
 * @returns {JSX.Element}
 */
export default function SubmissionDetailPage() {
  const { t, i18n }      = useTranslation()
  const { id }           = useParams()
  const location         = useLocation()
  const { user }         = useAuth()
  const [submission,     setSubmission]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [transitioning,  setTransitioning]  = useState(false)
  const [assigningId,    setAssigningId]    = useState('')
  const [successMsg,     setSuccessMsg]     = useState('')
  const [pdfLoading,     setPdfLoading]     = useState(null)
  const { statusMap }    = useStatusConfig({ submissionId: id })

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
      const { data } = await api.get(`/submissions/${id}`)
      setSubmission(data.submission)
      setAssigningId(data.submission.reviewerId ?? '')
    } catch {
      setError(t('submission.detail.loadError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchSubmission() }, [fetchSubmission])

  /**
   * Handles status transition action.
   * @param {string} newStatus
   */
  async function handleTransition(newStatus) {
    setTransitioning(true)
    setSuccessMsg('')
    try {
      await api.patch(`/submissions/${id}/status`, { status: newStatus })
      setSuccessMsg(t('submission.detail.statusUpdatedTo', { status: getStatusLabel(newStatus) }))
      await fetchSubmission()
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
    } finally {
      setTransitioning(false)
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
      await api.patch(`/submissions/${id}/assign`, { reviewerId: assigningId })
      setSuccessMsg(t('submission.detail.reviewerAssigned'))
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
    await api.post(`/submissions/${id}/comments`, { content, isInternal })
    await fetchSubmission()
  }

  /**
   * Generates and downloads the approval letter PDF.
   * @param {'he'|'en'} lang
   */
  async function handleDownloadPdf(lang) {
    setPdfLoading(lang)
    try {
      const response = await api.post(
        `/submissions/${id}/approval-letter?lang=${lang}`,
        {},
        { responseType: 'blob' }
      )
      const url  = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        const link = document.createElement('a')
        link.href     = url
        link.download = `approval-letter-${lang}-${submission.applicationId}.pdf`
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

      {/* Approval letter download — only when approved */}
      {submission?.status === 'APPROVED' && (
        <Card>
          <CardHeader title={t('documents.sectionTitle')} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => handleDownloadPdf('he')}
                disabled={pdfLoading !== null}
                loading={pdfLoading === 'he'}
                leftIcon={
                  <Download
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
              >
                {t('statusPage.downloadPdf')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownloadPdf('en')}
                disabled={pdfLoading !== null}
                loading={pdfLoading === 'en'}
                leftIcon={
                  <Download
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
              >
                {t('statusPage.downloadPdfEn')}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" as="section">
          <CardHeader title={t('submission.detail.sectionAnswers')} />
          <CardBody>
            <FormAnswersViewer
              formConfig={submission?.formConfig}
              dataJson={latestVersion?.dataJson ?? {}}
            />
          </CardBody>
        </Card>

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
                  {submission.reviewer.fullName}
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
    </main>
  )
}
