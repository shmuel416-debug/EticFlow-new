/**
 * EthicFlow — Chairman Submission Decision Page
 * Full submission view with form answers, reviewer comments, and decision buttons.
 * Refreshed to Lev design system (PageHeader + Card primitives + Modal confirmations).
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import CommentThread from '../../components/submissions/CommentThread'
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

const DECISIONS = [
  {
    key: 'APPROVED',
    variant: 'primary',
    icon: CheckCircle2,
    labelKey: 'chairman.decision.approve',
    confirm: 'chairman.decision.confirmApprove',
    tone: 'success',
  },
  {
    key: 'REJECTED',
    variant: 'danger',
    icon: XCircle,
    labelKey: 'chairman.decision.reject',
    confirm: 'chairman.decision.confirmReject',
    tone: 'danger',
  },
  {
    key: 'REVISION_REQUIRED',
    variant: 'secondary',
    icon: AlertTriangle,
    labelKey: 'chairman.decision.requestRevision',
    confirm: 'chairman.decision.confirmRevision',
    tone: 'warning',
  },
]

/**
 * Chairman's decision page for a single submission.
 * @returns {JSX.Element}
 */
export default function SubmissionDecisionPage() {
  const { t }        = useTranslation()
  const { id }       = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [deciding,   setDeciding]   = useState(false)
  const [note,       setNote]       = useState('')
  const [error,      setError]      = useState('')
  const [pendingDecision, setPendingDecision] = useState(null)
  const backTo       =
    typeof location.state?.from === 'string' ? location.state.from : '/chairman/queue'

  /**
   * Fetches submission from API.
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

  /**
   * Commits the pending decision after modal confirmation.
   */
  async function handleConfirmDecision() {
    if (!pendingDecision) return
    setDeciding(true)
    setError('')
    try {
      await api.patch(`/submissions/${id}/decision`, {
        decision: pendingDecision.key,
        note: note.trim() || undefined,
      })
      navigate(backTo)
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
      setDeciding(false)
      setPendingDecision(null)
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
  if (!submission) {
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

  const latestVersion  = submission.versions?.slice(-1)[0]
  const alreadyDecided = submission.status !== 'IN_REVIEW'
  const ConfirmIcon    = pendingDecision?.icon ?? null

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="text-xs font-mono"
        style={{ color: 'var(--text-muted)' }}
      >
        {submission.applicationId}
      </span>
      <StatusBadge status={submission.status} />
    </div>
  )

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={submission.title}
        subtitle={submission.applicationId}
        backTo={backTo}
        backLabel={t('submission.detail.backToList')}
        actions={headerActions}
      />

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card as="section" className="lg:col-span-2">
          <CardHeader title={t('submission.detail.sectionAnswers')} />
          <CardBody>
            <FormAnswersViewer
              formConfig={submission.formConfig}
              dataJson={latestVersion?.dataJson ?? {}}
            />
          </CardBody>
        </Card>

        <aside>
          <Card as="section">
            <CardHeader title={t('chairman.decision.pageTitle')} />
            <CardBody>
              {alreadyDecided ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('chairman.decision.decisionRecorded')}
                </p>
              ) : (
                <div className="space-y-4">
                  <FormField
                    label={t('chairman.decision.noteLabel')}
                    render={({ inputId, describedBy, required, invalid }) => (
                      <Textarea
                        id={inputId}
                        data-testid="chairman-decision-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t('chairman.decision.notePlaceholder')}
                        aria-required={required || undefined}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        rows={3}
                      />
                    )}
                  />

                  <div
                    id="decision-actions"
                    role="group"
                    aria-label={t('chairman.decision.pageTitle')}
                    className="space-y-2"
                  >
                    {DECISIONS.map(({ key, variant, icon: Icon, labelKey }) => (
                      <Button
                        key={key}
                        data-testid={`chairman-decision-${key}`}
                        onClick={() =>
                          setPendingDecision(
                            DECISIONS.find((d) => d.key === key) ?? null
                          )
                        }
                        disabled={deciding}
                        variant={variant}
                        fullWidth
                        aria-describedby="decision-actions"
                        leftIcon={
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            focusable="false"
                          />
                        }
                      >
                        {t(labelKey)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <Card as="section">
        <CardHeader title={t('submission.detail.sectionComments')} />
        <CardBody>
          <CommentThread comments={submission.comments ?? []} onAdd={null} />
        </CardBody>
      </Card>

      <Modal
        open={!!pendingDecision}
        onClose={() => !deciding && setPendingDecision(null)}
        title={pendingDecision ? t(pendingDecision.confirm) : ''}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDecision(null)}
              disabled={deciding}
            >
              {t('common.cancel', 'ביטול')}
            </Button>
            <Button
              variant={pendingDecision?.variant ?? 'primary'}
              onClick={handleConfirmDecision}
              loading={deciding}
              leftIcon={
                ConfirmIcon ? (
                  <ConfirmIcon
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    focusable="false"
                  />
                ) : null
              }
            >
              {pendingDecision ? t(pendingDecision.labelKey) : ''}
            </Button>
          </>
        }
      >
        {pendingDecision && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t(pendingDecision.confirm)}
          </p>
        )}
      </Modal>
    </main>
  )
}
