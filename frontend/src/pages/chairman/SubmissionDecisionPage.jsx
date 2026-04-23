/**
 * EthicFlow — Chairman Submission Decision Page
 * Full submission view with form answers, reviewer comments, and decision buttons.
 * IS 5568: confirmation dialogs via window.confirm, aria-describedby on buttons.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'
import CommentThread from '../../components/submissions/CommentThread'

const DECISIONS = [
  { key: 'APPROVED',           style: 'bg-green-600 hover:bg-green-700 text-white', confirm: 'chairman.decision.confirmApprove' },
  { key: 'REJECTED',           style: 'bg-red-600 hover:bg-red-700 text-white',     confirm: 'chairman.decision.confirmReject' },
  { key: 'REVISION_REQUIRED',  style: 'bg-yellow-500 hover:bg-yellow-600 text-white', confirm: 'chairman.decision.confirmRevision' },
]

/**
 * Chairman's decision page for a single submission.
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
  const backTo       = typeof location.state?.from === 'string' ? location.state.from : '/chairman/queue'

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
   * Records a chairman decision.
   * @param {string} decision - APPROVED | REJECTED | REVISION_REQUIRED
   * @param {string} confirmKey - i18n key for confirmation dialog
   */
  async function handleDecision(decision, confirmKey) {
    if (!window.confirm(t(confirmKey))) return
    setDeciding(true)
    setError('')
    try {
      await api.patch(`/submissions/${id}/decision`, { decision, note: note.trim() || undefined })
      navigate(backTo)
    } catch (err) {
      setError(t(`errors.${err.code}`, t('errors.SERVER_ERROR')))
      setDeciding(false)
    }
  }

  if (loading)   return <div className="p-8 text-center text-gray-400">{t('common.loading')}</div>
  if (!submission) return <div className="p-8 text-center text-red-600" role="alert">{error}</div>

  const latestVersion   = submission.versions?.slice(-1)[0]
  const alreadyDecided  = submission.status !== 'IN_REVIEW'

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Link to={backTo} className="text-sm hover:underline mb-2 inline-flex items-center gap-1"
          style={{ color: 'var(--lev-navy)' }}>
          ← {t('submission.detail.backToList')}
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>{submission.title}</h1>
          <StatusBadge status={submission.status} />
          <span className="text-sm text-gray-500 font-mono">{submission.applicationId}</span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form answers */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
            {t('submission.detail.sectionAnswers')}
          </h2>
          <FormAnswersViewer formConfig={submission.formConfig} dataJson={latestVersion?.dataJson ?? {}} />
        </section>

        {/* Decision panel */}
        <aside>
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--lev-navy)' }}>
              {t('chairman.decision.pageTitle')}
            </h2>

            {alreadyDecided ? (
              <p className="text-sm text-gray-500">{t('chairman.decision.decisionRecorded')}</p>
            ) : (
              <>
                <div>
                  <label htmlFor="decision-note" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('chairman.decision.noteLabel')}
                  </label>
                  <textarea
                    id="decision-note"
                    data-testid="chairman-decision-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('chairman.decision.notePlaceholder')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                  />
                </div>

                <div id="decision-actions" className="space-y-2">
                  {DECISIONS.map(({ key, style, confirm }) => (
                    <button
                      key={key}
                      data-testid={`chairman-decision-${key}`}
                      onClick={() => handleDecision(key, confirm)}
                      disabled={deciding}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${style}`}
                      style={{ minHeight: '44px' }}
                      aria-describedby="decision-actions"
                    >
                      {t(`chairman.decision.${key === 'APPROVED' ? 'approve' : key === 'REJECTED' ? 'reject' : 'requestRevision'}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </aside>
      </div>

      {/* Comments */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.detail.sectionComments')}
        </h2>
        <CommentThread comments={submission.comments ?? []} onAdd={null} />
      </section>
    </main>
  )
}
