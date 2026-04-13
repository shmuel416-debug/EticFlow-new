/**
 * EthicFlow — Submission Status Page (Researcher)
 * Full timeline view for a single submission.
 * Tabs: ציר זמן | הערות | מסמכים.
 * Lev palette, mobile-first, IS 5568.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import CommentThread from '../../components/submissions/CommentThread'
import FormAnswersViewer from '../../components/submissions/FormAnswersViewer'

const STATUS_ORDER = ['SUBMITTED','IN_TRIAGE','ASSIGNED','IN_REVIEW','PENDING_REVISION','APPROVED']
const STATUS_STEP  = { DRAFT:0,SUBMITTED:1,IN_TRIAGE:2,ASSIGNED:3,IN_REVIEW:4,PENDING_REVISION:4,APPROVED:5,REJECTED:5,WITHDRAWN:5 }

/**
 * Renders SLA indicator for a submission.
 * @param {{ sla: object|null }} props
 */
function SlaIndicator({ sla }) {
  const { t } = useTranslation()
  if (!sla) return null
  const due  = sla.reviewDue || sla.triageDue
  if (!due) return null
  const days = Math.ceil((new Date(due) - Date.now()) / 86400000)
  const { color, label } = days < 0
    ? { color: '#dc2626', label: t('dashboard.researcher.slaBreach') }
    : days <= 2
      ? { color: '#d97706', label: t('dashboard.researcher.slaRemaining', { days }) }
      : { color: '#16a34a', label: t('dashboard.researcher.slaRemaining', { days }) }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  )
}

/**
 * Full status page for researcher to track their submission.
 */
export default function SubmissionStatusPage() {
  const { t }        = useTranslation()
  const { id }       = useParams()
  const [submission, setSubmission] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [activeTab,  setActiveTab]  = useState('timeline')

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

  if (loading) return <div className="py-20 text-center text-gray-400">{t('common.loading')}</div>
  if (error)   return <div className="py-20 text-center text-red-600" role="alert">{error}</div>

  const step     = STATUS_STEP[submission.status] ?? 1
  const latest   = submission.versions?.slice(-1)[0]
  const progress = Math.round((step / 5) * 100)

  return (
    <main id="main-content" className="max-w-3xl mx-auto space-y-5 p-4 md:p-6">

      {/* Back link */}
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:underline"
        style={{ color: 'var(--lev-teal-text)' }}>
        ← {t('statusPage.backToDashboard')}
      </Link>

      {/* Title + status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold" style={{ color: 'var(--lev-navy)' }}>{submission.title}</h1>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{submission.applicationId}</p>
          </div>
          <StatusBadge status={submission.status} />
        </div>

        <SlaIndicator sla={submission.slaTracking} />

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar"
            aria-valuenow={step} aria-valuemin={0} aria-valuemax={5}
            aria-label={t('statusPage.progressLabel', { current: step, total: 5 })}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: submission.status === 'REJECTED' ? '#dc2626' : 'var(--lev-teal-text)' }} />
          </div>
          <p className="text-xs text-center mt-1 text-gray-500">
            {t('statusPage.progressLabel', { current: step, total: 5 })}
          </p>
        </div>

        {/* Action buttons */}
        {submission.status === 'PENDING_REVISION' && (
          <Link to={`/submissions/${id}/edit`}
            className="mt-4 w-full py-2.5 text-sm font-bold text-white rounded-xl text-center hover:opacity-90 transition block"
            style={{ background: '#dc2626' }}>
            {t('statusPage.fixAndResubmit')} →
          </Link>
        )}
        {submission.status === 'APPROVED' && (
          <button className="mt-4 w-full py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 transition"
            style={{ background: 'var(--lev-teal-text)' }}>
            ⬇ {t('statusPage.downloadPdf')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div role="tablist" className="flex border-b border-gray-100">
          {[
            { key: 'timeline',  label: t('statusPage.timeline') },
            { key: 'comments',  label: t('statusPage.comments') },
            { key: 'answers',   label: t('submission.detail.sectionAnswers') },
          ].map(tab => (
            <button key={tab.key} role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key ? 'border-b-2 font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.key ? { color: 'var(--lev-navy)', borderColor: 'var(--lev-navy)' } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="p-5">
          {activeTab === 'timeline' && (
            <div className="space-y-0" role="list" aria-label={t('statusPage.timeline')}>
              {STATUS_ORDER.map((s, i) => {
                const done   = STATUS_STEP[submission.status] > i
                const active = STATUS_STEP[submission.status] === i + 1 && submission.status === s
                const cur    = submission.status === s

                return (
                  <div key={s} role="listitem" className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{
                          background: done || cur ? (submission.status === 'REJECTED' && cur ? '#dc2626' : 'var(--lev-teal-text)') : '#f3f4f6',
                          color:      done || cur ? '#fff' : '#9ca3af',
                        }}>
                        {done ? '✓' : i + 1}
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className="w-0.5 my-1 min-h-[24px]"
                          style={{ background: done ? 'var(--lev-teal-text)' : '#e5e7eb' }} />
                      )}
                    </div>
                    <div className={`pb-5 ${!done && !cur ? 'opacity-40' : ''}`}>
                      <p className="text-sm font-semibold" style={{ color: cur ? 'var(--lev-navy)' : '#374151' }}>
                        {t(`statusPage.steps.${s}`)}
                        {cur && <span className="text-xs font-normal ms-2" style={{ color: 'var(--lev-teal-text)' }}>
                          {t('statusPage.currentStep')}
                        </span>}
                      </p>
                      {s === 'ASSIGNED' && submission.reviewer && (
                        <p className="text-xs text-gray-500 mt-0.5">
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
            <FormAnswersViewer formConfig={submission.formConfig} dataJson={latest?.dataJson ?? {}} />
          )}
        </div>
      </div>
    </main>
  )
}
