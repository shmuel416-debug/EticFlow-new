/**
 * EthicFlow — Researcher Dashboard
 * Design C: split-screen list (right) + timeline detail (left).
 * Lev palette: --lev-navy, --lev-teal, --lev-purple.
 * Real data via GET /api/submissions (role-filtered).
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Link, useLocation } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'

/** Returns the correct route for a submission based on its status */
function submissionRoute(sub) {
  if (sub.status === 'DRAFT' || sub.status === 'PENDING_REVISION') {
    return `/submissions/${sub.id}/edit`
  }
  return `/submissions/${sub.id}`
}

/** Status → workflow step index (0-based, max 4) */
const STATUS_STEP = {
  DRAFT: 0, SUBMITTED: 1, IN_TRIAGE: 1, ASSIGNED: 2,
  IN_REVIEW: 3, PENDING_REVISION: 3, APPROVED: 4, REJECTED: 4, WITHDRAWN: 4,
}

const STEPS = ['SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'IN_REVIEW', 'APPROVED']

/** SLA dot color based on days remaining (null = no SLA). */
function slaDot(sub) {
  const sla = sub.slaTracking
  if (!sla) return null
  const due = sla.reviewDue || sla.triageDue
  if (!due) return null
  const days = Math.ceil((new Date(due) - Date.now()) / 86400000)
  if (days < 0)  return { color: '#dc2626', label: null, breach: true, days }
  if (days <= 2) return { color: '#d97706', label: days, breach: false, days }
  return { color: '#16a34a', label: days, breach: false, days }
}

/**
 * Compact submission card for the list pane.
 * @param {{ sub: object, selected: boolean, onClick: Function }} props
 */
function SubCard({ sub, selected, onClick, returnPath }) {
  const { t } = useTranslation()
  const sla = slaDot(sub)
  const urgent = sub.status === 'PENDING_REVISION'

  return (
    <Link
      to={submissionRoute(sub)}
      state={{ from: returnPath }}
      onClick={onClick}
      className={`w-full text-right rounded-xl p-3 transition-all border text-sm block ${
        selected
          ? 'text-white border-transparent shadow-md'
          : urgent
            ? 'bg-red-50 border-red-200 hover:border-red-300'
            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
      }`}
      style={selected ? { background: 'var(--lev-navy)' } : {}}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`font-semibold leading-tight text-right ${selected ? 'text-white' : urgent ? 'text-red-800' : 'text-gray-800'}`}>
          {sub.title}
        </p>
        <StatusBadge status={sub.status} className="flex-shrink-0 text-xs" />
      </div>
      <p className={`text-xs font-mono mb-1.5 ${selected ? 'text-blue-200' : 'text-gray-400'}`}>{sub.applicationId}</p>
      {sla && (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sla.color }} aria-hidden="true" />
          <span className={`text-xs ${sla.breach ? 'font-bold' : ''}`} style={{ color: selected ? '#fde68a' : sla.color }}>
            {sla.breach
              ? t('dashboard.researcher.slaBreach')
              : t('dashboard.researcher.slaRemaining', { days: sla.days })}
          </span>
        </div>
      )}
    </Link>
  )
}

/**
 * Timeline detail pane for selected submission.
 * @param {{ sub: object }} props
 */
function TimelinePane({ sub, returnPath }) {
  const { t } = useTranslation()
  const currentStep = STATUS_STEP[sub.status] ?? 1

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--lev-navy)' }}>{sub.title}</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{sub.applicationId}</p>
        </div>
        <Link
          to={`/submissions/${sub.id}`}
          state={{ from: returnPath }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white hover:opacity-90 flex-shrink-0"
          style={{ background: 'var(--lev-teal-text)', minHeight: '36px', display: 'flex', alignItems: 'center' }}
        >
          {t('common.fullDetails')} {t('common.arrowNext')}
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{t('statusPage.steps.SUBMITTED')}</span>
          <span className="hidden sm:block">{t('statusPage.steps.IN_TRIAGE')}</span>
          <span>{t('statusPage.steps.IN_REVIEW')}</span>
          <span>{t('statusPage.steps.APPROVED')}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar"
          aria-valuenow={currentStep} aria-valuemin={0} aria-valuemax={4}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / 4) * 100}%`, background: 'var(--lev-teal-text)' }}
          />
        </div>
        <p className="text-xs text-center mt-1" style={{ color: 'var(--lev-teal-text)' }}>
          {t('dashboard.researcher.step', { current: currentStep + 1, total: 5 })}
        </p>
      </div>

      {/* Timeline steps */}
      <div className="flex-1 space-y-0" role="list" aria-label={t('statusPage.timeline')}>
        {STEPS.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          const pending = i > currentStep

          return (
            <div key={step} role="listitem" className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                    done    ? 'text-white' :
                    active  ? 'ring-2 ring-offset-1 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}
                  style={done ? { background: 'var(--lev-teal-text)' } : active ? { background: 'var(--lev-navy)', ringColor: 'var(--lev-teal)' } : {}}
                  aria-label={`${t(`statusPage.steps.${step}`)}${done ? ` — ${t('common.completed')}` : active ? ` — ${t('common.current')}` : ` — ${t('common.future')}`}`}
                >
                  {done ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-0.5 my-1 flex-1 min-h-[20px]"
                    style={{ background: done ? 'var(--lev-teal-text)' : '#e5e7eb' }} />
                )}
              </div>

              <div className={`pb-4 ${pending ? 'opacity-40' : ''}`}>
                <p className={`text-sm font-semibold ${active ? '' : done ? 'text-gray-600' : 'text-gray-400'}`}
                  style={active ? { color: 'var(--lev-navy)' } : {}}>
                  {t(`statusPage.steps.${step}`)}
                  {active && <span className="text-xs font-normal ms-2" style={{ color: 'var(--lev-teal-text)' }}>{t('statusPage.currentStep')}</span>}
                </p>
                {step === 'ASSIGNED' && sub.reviewer && (
                  <p className="text-xs text-gray-500 mt-0.5">{sub.reviewer.fullName}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action button */}
      {sub.status === 'PENDING_REVISION' && (
        <Link to={`/submissions/${sub.id}`} state={{ from: returnPath }}
          className="mt-4 w-full py-2.5 text-sm font-bold text-white rounded-xl text-center hover:opacity-90 transition"
          style={{ background: '#dc2626' }}>
          {t('dashboard.researcher.fixAndResubmit')} →
        </Link>
      )}
      {sub.status === 'APPROVED' && (
        <button className="mt-4 w-full py-2.5 text-sm font-bold rounded-xl text-white hover:opacity-90 transition"
          style={{ background: 'var(--lev-teal-text)' }}>
          ⬇ {t('dashboard.researcher.approvalLetter')}
        </button>
      )}
    </div>
  )
}

/**
 * Main Researcher Dashboard component.
 * Fetches real submissions and renders Design C split-screen.
 */
export default function ResearcherDashboard() {
  const { t }    = useTranslation()
  const location = useLocation()
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const returnPath = `${location.pathname}${location.search}`

  useEffect(() => {
    /** Loads researcher's own submissions from API. */
    async function load() {
      try {
        const { data } = await api.get('/submissions?limit=20')
        setSubmissions(data.data ?? [])
        if (data.data?.length) setSelected(data.data[0])
      } catch {
        setError(t('dashboard.researcher.loadError'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  // Derived stats
  const active   = submissions.filter(s => !['APPROVED','REJECTED','WITHDRAWN'].includes(s.status)).length
  const revision = submissions.filter(s => s.status === 'PENDING_REVISION').length
  const approved = submissions.filter(s => s.status === 'APPROVED').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('dashboard.researcher.greeting')}, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.researcher.title')}</p>
        </div>
        <Link to="/submissions/new"
          className="text-sm font-bold text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition"
          style={{ background: 'var(--lev-navy)', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          + {t('dashboard.researcher.newSubmission')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('dashboard.researcher.activeSubmissions'), value: active,   color: 'var(--lev-navy)' },
          { label: t('dashboard.researcher.pendingRevision'),   value: revision, color: '#dc2626' },
          { label: t('dashboard.researcher.approvedThisYear'),  value: approved, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black" style={{ color }}>{loading ? '—' : value}</p>
            <p className="text-xs text-gray-500 mt-1 leading-snug">{label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {/* Split-screen panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('dashboard.researcher.recentSubmissions')}
          </h2>
          <Link to="/submissions" className="text-xs font-medium hover:underline"
            style={{ color: 'var(--lev-teal-text)' }}>
            {t('dashboard.researcher.viewAll')}
          </Link>
        </div>

        {loading && (
          <div className="py-16 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        )}

        {!loading && submissions.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-3xl mb-2" aria-hidden="true">📋</p>
            <p className="text-sm font-medium text-gray-600">{t('dashboard.researcher.noSubmissions')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('dashboard.researcher.noSubmissionsHint')}</p>
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <div className="grid md:grid-cols-5 min-h-[360px]">
            {/* List pane */}
            <div className="md:col-span-2 border-b md:border-b-0 md:border-s border-gray-100 p-3 space-y-2 overflow-y-auto max-h-[360px]">
              {submissions.map(sub => (
                <SubCard key={sub.id} sub={sub}
                  selected={selected?.id === sub.id}
                  onClick={() => setSelected(sub)}
                  returnPath={returnPath} />
              ))}
            </div>

            {/* Timeline pane — desktop */}
            <div className="md:col-span-3 hidden md:block max-h-[360px]">
              {selected
                ? <TimelinePane sub={selected} returnPath={returnPath} />
                : <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    {t('dashboard.researcher.selectToView')}
                  </div>
              }
            </div>

            {/* Mobile: show timeline of selected below list */}
            {selected && (
              <div className="md:hidden border-t border-gray-100 col-span-5">
                <TimelinePane sub={selected} returnPath={returnPath} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
