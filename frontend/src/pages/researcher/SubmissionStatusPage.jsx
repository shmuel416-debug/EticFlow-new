/**
 * EthicFlow — Submission Status Page (Researcher)
 * Full timeline view for a single submission.
 * Tabs: answers | timeline | comments | documents.
 * Refreshed to Lev design system (PageHeader + Card primitives + Tabs).
 * IS 5568 / WCAG 2.2 AA. Lev palette only.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Check,
  Circle,
  Download,
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

const STATUS_ORDER = ['SUBMITTED','IN_TRIAGE','ASSIGNED','IN_REVIEW','PENDING_REVISION','APPROVED']
const STATUS_STEP  = { DRAFT:0,SUBMITTED:1,IN_TRIAGE:2,ASSIGNED:3,IN_REVIEW:4,PENDING_REVISION:4,APPROVED:5,REJECTED:5,WITHDRAWN:5 }

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
  const { id }       = useParams()
  const location     = useLocation()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const isRtl        = i18n.dir() === 'rtl'
  const FixArrow     = isRtl ? ArrowLeft : ArrowRight
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('answers')
  const [pdfLoading, setPdfLoading] = useState(null) // 'he' | 'en' | null
  const [withdrawing, setWithdrawing] = useState(false)
  const [nowMs]      = useState(() => Date.now())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [withdrawNote, setWithdrawNote] = useState('')
  const backTo = typeof location.state?.from === 'string' ? location.state.from : '/dashboard'

  /** Loads submission from API. */
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/submissions/${id}`)
      setSubmission(data.submission)
    } catch {
      setError(t('statusPage.loadError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  /**
   * Requests the approval letter PDF in the given language and triggers browser download.
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
      const link = document.createElement('a')
      link.href     = url
      link.download = `approval-letter-${lang}-${submission.applicationId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
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
      await api.post(`/submissions/${id}/withdraw`, {
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

  const step     = STATUS_STEP[submission.status] ?? 1
  const latest   = submission.versions?.slice(-1)[0]
  const progress = Math.round((step / 5) * 100)

  return (
    <main id="main-content" className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title={submission.title}
        subtitle={submission.applicationId}
        backTo={backTo}
        backLabel={t('statusPage.backToDashboard')}
        actions={<StatusBadge status={submission.status} />}
      />

      <Card>
        <CardBody>
          <SlaIndicator sla={submission.slaTracking} nowMs={nowMs} />

          <div className="mt-4">
            <div
              className="h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-label={t('statusPage.progressLabel', { current: step, total: 5 })}
              style={{
                background: 'var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background:
                    submission.status === 'REJECTED'
                      ? 'var(--status-danger)'
                      : 'var(--lev-teal-text)',
                  borderRadius: 'var(--radius-full)',
                }}
              />
            </div>
            <p
              className="text-xs text-center mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {t('statusPage.progressLabel', { current: step, total: 5 })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {submission.status === 'PENDING_REVISION' && (
              <Button
                variant="danger"
                fullWidth
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
                onClick={() => navigate(`/submissions/${id}/edit`)}
              >
                {t('statusPage.fixAndResubmit')}
              </Button>
            )}

            {['DRAFT', 'SUBMITTED', 'IN_TRIAGE', 'PENDING_REVISION'].includes(
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

            {submission.status === 'APPROVED' && user?.role !== 'REVIEWER' && (
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  fullWidth
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
                  fullWidth
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
            )}
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
              <div
                className="space-y-0"
                role="list"
                aria-label={t('statusPage.timeline')}
              >
                {STATUS_ORDER.map((s, i) => {
                  const done = STATUS_STEP[submission.status] > i
                  const cur  = submission.status === s
                  const isRejected = submission.status === 'REJECTED' && cur
                  const activeBg = isRejected
                    ? 'var(--status-danger)'
                    : 'var(--lev-teal-text)'

                  return (
                    <div key={s} role="listitem" className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-full)',
                            background:
                              done || cur
                                ? activeBg
                                : 'var(--surface-sunken)',
                            color:
                              done || cur ? '#fff' : 'var(--text-muted)',
                          }}
                        >
                          {done ? (
                            <Check
                              size={18}
                              strokeWidth={2}
                              aria-hidden="true"
                              focusable="false"
                            />
                          ) : (
                            <span aria-hidden="true">{i + 1}</span>
                          )}
                        </div>
                        {i < STATUS_ORDER.length - 1 && (
                          <div
                            className="my-1"
                            style={{
                              width: 2,
                              minHeight: 24,
                              background: done
                                ? 'var(--lev-teal-text)'
                                : 'var(--border-default)',
                            }}
                          />
                        )}
                      </div>
                      <div className={`pb-5 ${!done && !cur ? 'opacity-40' : ''}`}>
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color: cur
                              ? 'var(--lev-navy)'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {t(`statusPage.steps.${s}`)}
                          {cur && (
                            <span
                              className="text-xs font-normal ms-2"
                              style={{ color: 'var(--lev-teal-text)' }}
                            >
                              {t('statusPage.currentStep')}
                            </span>
                          )}
                        </p>
                        {s === 'ASSIGNED' && submission.reviewer && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t('statusPage.reviewer')}: {submission.reviewer.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
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
                canUpload={['DRAFT','SUBMITTED','PENDING_REVISION'].includes(
                  submission.status
                )}
              />
            )}
          </div>
        </CardBody>
      </Card>

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
