/**
 * Ethic-Net — Submission Status Page (Researcher)
 * Full timeline view for a single submission.
 * Tabs: answers | timeline | comments | documents.
 * Refreshed to Lev design system (PageHeader + Card primitives + Tabs).
 * IS 5568 / WCAG 2.2 AA. Lev palette only.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Pencil,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/submissions/StatusBadge'
import CommentThread from '../../components/submissions/CommentThread'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import DocumentList from '../../components/submissions/DocumentList'
import SubmissionLifecycle from '../../components/submissions/SubmissionLifecycle'
import {
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Button,
  Spinner,
  Tabs,
  Modal,
  Textarea,
  FormField,
} from '../../components/ui'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { buildEntityDocumentTitle } from '../../utils/documentTitle'
import {
  buildSubmissionDetailPath,
  buildSubmissionEditPath,
} from '../../utils/submissionRoutes'

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
 * Renders SLA indicator for a submission.
 * @param {{ sla: object|null, nowMs: number }} props
 */
function SlaIndicator({ sla, nowMs }) {
  const { t } = useTranslation()
  if (!sla) return null
  const due  = sla.reviewDue || sla.triageDue
  if (!due) return null
  const days = Math.ceil((new Date(due).getTime() - nowMs) / 86400000)
  const { color, label } = days < 0
    ? { color: 'var(--status-danger)', label: t('dashboard.researcher.slaBreach') }
    : days <= 2
      ? { color: 'var(--status-warning)', label: t('dashboard.researcher.slaRemaining', { days }) }
      : { color: 'var(--status-success)', label: t('dashboard.researcher.slaRemaining', { days }) }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex-shrink-0"
        style={{
          width: 10,
          height: 10,
          borderRadius: 'var(--radius-full)',
          background: color,
        }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  )
}

/**
 * Full status page for researcher to track their submission.
 * @returns {JSX.Element}
 */
export default function SubmissionStatusPage() {
  const { t, i18n } = useTranslation()
  const { id: submissionRef } = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const isRtl        = i18n.dir() === 'rtl'
  const FixArrow     = isRtl ? ArrowLeft : ArrowRight
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('answers')
  const [pdfLoading, setPdfLoading] = useState(null) // 'download-he' | 'download-en' | 'preview-he' | 'preview-en' | null
  const [pdfFreshGeneration, setPdfFreshGeneration] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [nowMs]      = useState(() => Date.now())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [withdrawNote, setWithdrawNote] = useState('')
  const resolvedSubmissionId = submission?.id || submissionRef
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/dashboard'

  const documentTitle = useMemo(
    () => buildEntityDocumentTitle(
      submission?.applicationId,
      submission?.title,
      t('submission.detail.pageTitle')
    ),
    [submission?.applicationId, submission?.title, t]
  )
  useDocumentTitle(documentTitle)

  /** Loads submission from API. */
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/submissions/${submissionRef}`)
      setSubmission(data.submission)
    } catch {
      setError(t('statusPage.loadError'))
    } finally {
      setLoading(false)
    }
  }, [submissionRef, t])

  useEffect(() => {
    if (!submission) return
    const canonicalPath = buildSubmissionDetailPath('/submissions', submission)
    if (!canonicalPath || location.pathname === canonicalPath) return
    navigate(canonicalPath, { replace: true, state: location.state })
  }, [location.pathname, location.state, navigate, submission])

  useEffect(() => { load() }, [load])

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
   * Requests the approval letter PDF in the given language and triggers browser download.
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

  /**
   * Withdraws the current submission after confirmation via modal.
   * @returns {Promise<void>}
   */
  async function handleConfirmWithdraw() {
    setWithdrawing(true)
    try {
      await api.post(`/submissions/${resolvedSubmissionId}/withdraw`, {
        note: withdrawNote.trim() || undefined,
      })
      setConfirmOpen(false)
      setWithdrawNote('')
      await load()
    } catch {
      setError(t('errors.SERVER_ERROR'))
    } finally {
      setWithdrawing(false)
    }
  }

  /**
   * Moves a PENDING_REVISION submission into REVISION_DRAFT, then opens the editor.
   * @returns {Promise<void>}
   */
  async function handleStartRevision() {
    setActionLoading(true)
    try {
      await api.post(`/submissions/${resolvedSubmissionId}/start-revision`, {})
      navigate(buildSubmissionEditPath('/submissions', submission))
    } catch {
      setError(t('statusPage.actionError'))
      setActionLoading(false)
    }
  }

  /**
   * Resubmits a REVISION_DRAFT submission for a new review round.
   * @returns {Promise<void>}
   */
  async function handleResubmit() {
    setActionLoading(true)
    try {
      await api.post(`/submissions/${resolvedSubmissionId}/submit`, {})
      await load()
    } catch {
      setError(t('statusPage.actionError'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-3 py-20"
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
        className="py-20 text-center text-sm font-medium"
        style={{ color: 'var(--status-danger)' }}
      >
        {error}
      </div>
    )
  }

  const isPdfBusy = pdfLoading !== null
  const latest = submission.versions?.slice(-1)[0]
  const decisionLetter = DECISION_LETTER_CONFIG[submission.status] ?? null

  return (
    <main id="main-content" className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title={submission.title}
        subtitle={submission.applicationId}
        backTo={backTo}
        backLabel={t('statusPage.backToDashboard')}
        actions={<StatusBadge status={submission.status} audience="researcher" />}
      />

      <Card>
        <CardBody>
          <SlaIndicator sla={submission.slaTracking} nowMs={nowMs} />

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {submission.status === 'PENDING_REVISION' && (
              <Button
                variant="danger"
                fullWidth
                loading={actionLoading}
                leftIcon={
                  <Pencil
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
                rightIcon={
                  <FixArrow
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                }
                onClick={handleStartRevision}
              >
                {t('statusPage.fixAndResubmit')}
              </Button>
            )}

            {submission.status === 'REVISION_DRAFT' && (
              <>
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={
                    <Pencil
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      focusable="false"
                    />
                  }
                  onClick={() => navigate(buildSubmissionEditPath('/submissions', submission))}
                >
                  {t('statusPage.continueEditing')}
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  loading={actionLoading}
                  onClick={handleResubmit}
                >
                  {t('statusPage.resubmit')}
                </Button>
              </>
            )}

            {['DRAFT', 'SUBMITTED', 'IN_TRIAGE', 'PENDING_REVISION', 'REVISION_DRAFT'].includes(
              submission.status
            ) && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConfirmOpen(true)}
                disabled={withdrawing}
              >
                {withdrawing ? t('common.loading') : t('statusPage.withdraw')}
              </Button>
            )}

            {decisionLetter && user?.role !== 'REVIEWER' && (
              <>
              <p
                className="text-sm flex items-center gap-2"
                style={{ color: 'var(--status-success)' }}
                role="status"
              >
                <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                {t('statusPage.decisionLetterReady')}
              </p>
              <div className="flex gap-2 flex-wrap items-center">
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
                  fullWidth
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
                  fullWidth
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
              </>
            )}
            {isPdfBusy && pdfFreshGeneration ? (
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Spinner size={14} label={t(decisionLetter?.progressKey || 'statusPage.pdfInProgress')} />
                <span>{t(decisionLetter?.progressKey || 'statusPage.pdfInProgress')}</span>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody padded={false}>
          <div className="px-5 pt-4">
            <Tabs
              variant="underline"
              value={activeTab}
              onChange={setActiveTab}
              ariaLabel={t('statusPage.timeline')}
              items={[
                { key: 'answers',   label: t('submission.detail.sectionAnswers') },
                { key: 'timeline',  label: t('statusPage.timeline') },
                { key: 'comments',  label: t('statusPage.comments') },
                { key: 'documents', label: t('documents.tabLabel') },
              ]}
            />
          </div>

          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="p-5"
          >
            {activeTab === 'timeline' && (
              <SubmissionLifecycle
                submissionId={submission.id}
                currentStatus={submission.status}
                reviewer={submission.reviewer}
                userRole="RESEARCHER"
                variant="full"
              />
            )}

            {activeTab === 'comments' && (
              <CommentThread comments={submission.comments ?? []} onAdd={null} />
            )}

            {activeTab === 'answers' && (
              <FormAnswersViewer
                formConfig={submission.formConfig}
                dataJson={latest?.dataJson ?? {}}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentList
                submissionId={submission.id}
                canUpload={['DRAFT','SUBMITTED','REVISION_DRAFT'].includes(
                  submission.status
                )}
              />
            )}
          </div>
        </CardBody>
      </Card>

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
        open={confirmOpen}
        onClose={() => !withdrawing && setConfirmOpen(false)}
        title={t('statusPage.confirmWithdraw')}
        description={t('statusPage.withdrawReasonPrompt')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={withdrawing}
            >
              {t('common.cancel', 'ביטול')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmWithdraw}
              loading={withdrawing}
              leftIcon={
                <AlertTriangle
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  focusable="false"
                />
              }
            >
              {t('statusPage.withdraw')}
            </Button>
          </>
        }
      >
        <FormField
          label={t('statusPage.withdrawReasonPrompt')}
          render={({ inputId, describedBy, required, invalid }) => (
            <Textarea
              id={inputId}
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              aria-required={required || undefined}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={4}
            />
          )}
        />
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 text-xs inline-flex items-center gap-2"
          style={{ color: 'var(--status-warning)' }}
        >
          <AlertCircle
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
          />
          {t('statusPage.confirmWithdraw')}
        </p>
      </Modal>
    </main>
  )
}
