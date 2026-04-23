/**
 * EthicFlow — Researcher Dashboard (brand refresh)
 * Lev Academic Center palette + design-system primitives (PageHeader,
 * StatCard, Card, EmptyState, Button, Badge). Split-screen: submissions list
 * (right) + timeline detail (left). Real data via GET /api/submissions.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, FileText, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, ArrowLeft, Check, Download, Pencil, Inbox,
} from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import {
  Button, Card, CardHeader, PageHeader, StatCard, EmptyState, Spinner,
} from '../../components/ui'

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

/**
 * SLA status info (color via CSS vars, days-remaining label).
 * @param {object} sub
 * @returns {{color: string, breach: boolean, days: number}|null}
 */
function slaInfo(sub) {
  const sla = sub.slaTracking
  if (!sla) return null
  const due = sla.reviewDue || sla.triageDue
  if (!due) return null
  const days = Math.ceil((new Date(due) - Date.now()) / 86400000)
  if (days < 0)  return { color: 'var(--status-danger)',  breach: true,  days }
  if (days <= 2) return { color: 'var(--status-warning)', breach: false, days }
  return { color: 'var(--status-success)', breach: false, days }
}

/**
 * Compact submission card for the list pane.
 * @param {{ sub: object, selected: boolean, onClick: Function, returnPath: string }} props
 * @returns {JSX.Element}
 */
function SubCard({ sub, selected, onClick, returnPath }) {
  const { t } = useTranslation()
  const sla = slaInfo(sub)
  const urgent = sub.status === 'PENDING_REVISION'

  return (
    <Link
      to={submissionRoute(sub)}
      state={{ from: returnPath }}
      onClick={onClick}
      className="w-full text-right p-3 transition-all text-sm block"
      style={{
        borderRadius: 'var(--radius-xl)',
        border: '1px solid',
        borderColor: selected
          ? 'transparent'
          : urgent
            ? 'var(--status-danger-50)'
            : 'var(--border-subtle)',
        background: selected
          ? 'var(--lev-navy)'
          : urgent
            ? 'var(--status-danger-50)'
            : 'var(--surface-raised)',
        color: selected ? '#fff' : 'var(--text-primary)',
        boxShadow: selected ? 'var(--shadow-md)' : 'none',
      }}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p
          className="font-semibold leading-tight text-right"
          style={{
            color: selected
              ? '#fff'
              : urgent
                ? 'var(--status-danger)'
                : 'var(--text-primary)',
          }}
        >
          {sub.title}
        </p>
        <StatusBadge status={sub.status} className="flex-shrink-0 text-xs" />
      </div>
      <p
        className="text-xs font-mono mb-1.5"
        style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
      >
        {sub.applicationId}
      </p>
      {sla && (
        <div className="flex items-center gap-1.5">
          <Clock
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
            style={{ color: selected ? 'var(--lev-gold)' : sla.color, flexShrink: 0 }}
          />
          <span
            className={`text-xs ${sla.breach ? 'font-bold' : ''}`}
            style={{ color: selected ? 'var(--lev-gold)' : sla.color }}
          >
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
 * @param {{ sub: object, returnPath: string }} props
 * @returns {JSX.Element}
 */
function TimelinePane({ sub, returnPath }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const NextIcon = isRtl ? ArrowLeft : ArrowRight
  const currentStep = STATUS_STEP[sub.status] ?? 1

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2
            className="text-base font-bold truncate"
            style={{ color: 'var(--lev-navy)' }}
          >
            {sub.title}
          </h2>
          <p
            className="text-xs font-mono mt-0.5"
            style={{ color: 'var(--text-muted)' }}
          >
            {sub.applicationId}
          </p>
        </div>
        <Link
          to={`/submissions/${sub.id}`}
          state={{ from: returnPath }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 transition hover:opacity-90 flex-shrink-0"
          style={{
            background: 'var(--lev-navy-50)',
            color: 'var(--lev-navy)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            minHeight: 36,
          }}
        >
          <span>{t('common.fullDetails')}</span>
          <NextIcon size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </Link>
      </div>

      <div className="mb-5">
        <div
          className="flex justify-between text-xs mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>{t('statusPage.steps.SUBMITTED')}</span>
          <span className="hidden sm:block">{t('statusPage.steps.IN_TRIAGE')}</span>
          <span>{t('statusPage.steps.IN_REVIEW')}</span>
          <span>{t('statusPage.steps.APPROVED')}</span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-sunken)' }}
          role="progressbar"
          aria-valuenow={currentStep} aria-valuemin={0} aria-valuemax={4}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(currentStep / 4) * 100}%`,
              background: 'var(--gradient-brand-flat)',
            }}
          />
        </div>
        <p
          className="text-xs text-center mt-1"
          style={{ color: 'var(--lev-teal-text)' }}
        >
          {t('dashboard.researcher.step', { current: currentStep + 1, total: 5 })}
        </p>
      </div>

      <div className="flex-1 space-y-0" role="list" aria-label={t('statusPage.timeline')}>
        {STEPS.map((step, i) => {
          const done = i < currentStep
          const active = i === currentStep
          const pending = i > currentStep

          const bubbleStyle = done
            ? { background: 'var(--lev-teal-text)', color: '#fff' }
            : active
              ? { background: 'var(--lev-navy)', color: '#fff', boxShadow: '0 0 0 3px var(--lev-navy-50)' }
              : { background: 'var(--surface-sunken)', color: 'var(--text-muted)' }

          return (
            <div key={step} role="listitem" className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all"
                  style={bubbleStyle}
                  aria-label={`${t(`statusPage.steps.${step}`)}${done ? ` — ${t('common.completed')}` : active ? ` — ${t('common.current')}` : ` — ${t('common.future')}`}`}
                >
                  {done
                    ? <Check size={16} strokeWidth={2.25} aria-hidden="true" focusable="false" />
                    : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-0.5 my-1 flex-1 min-h-[20px]"
                    style={{ background: done ? 'var(--lev-teal-text)' : 'var(--border-default)' }}
                  />
                )}
              </div>

              <div className={`pb-4 ${pending ? 'opacity-40' : ''}`}>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: active
                      ? 'var(--lev-navy)'
                      : done
                        ? 'var(--text-secondary)'
                        : 'var(--text-muted)',
                  }}
                >
                  {t(`statusPage.steps.${step}`)}
                  {active && (
                    <span
                      className="text-xs font-normal ms-2"
                      style={{ color: 'var(--lev-teal-text)' }}
                    >
                      {t('statusPage.currentStep')}
                    </span>
                  )}
                </p>
                {step === 'ASSIGNED' && sub.reviewer && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {sub.reviewer.fullName}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {sub.status === 'PENDING_REVISION' && (
        <Link
          to={`/submissions/${sub.id}`}
          state={{ from: returnPath }}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white text-center transition hover:opacity-90"
          style={{
            background: 'var(--status-danger)',
            borderRadius: 'var(--radius-xl)',
            minHeight: 44,
          }}
        >
          <Pencil size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
          <span>{t('dashboard.researcher.fixAndResubmit')}</span>
        </Link>
      )}
      {sub.status === 'APPROVED' && (
        <button
          type="button"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{
            background: 'var(--lev-teal-text)',
            borderRadius: 'var(--radius-xl)',
            minHeight: 44,
          }}
        >
          <Download size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
          <span>{t('dashboard.researcher.approvalLetter')}</span>
        </button>
      )}
    </div>
  )
}

/**
 * Main Researcher Dashboard component.
 * Fetches real submissions and renders split-screen list + timeline.
 * @returns {JSX.Element}
 */
export default function ResearcherDashboard() {
  const { t }    = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const returnPath = `${location.pathname}${location.search}`

  useEffect(() => {
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

  const active   = submissions.filter(s => !['APPROVED','REJECTED','WITHDRAWN'].includes(s.status)).length
  const revision = submissions.filter(s => s.status === 'PENDING_REVISION').length
  const approved = submissions.filter(s => s.status === 'APPROVED').length

  const firstName = user?.fullName?.split(' ')[0]
  const headerTitle = firstName
    ? `${t('dashboard.researcher.greeting')}, ${firstName}`
    : t('dashboard.researcher.greeting')

  return (
    <div className="space-y-5">
      <PageHeader
        title={headerTitle}
        subtitle={t('dashboard.researcher.title')}
        actions={
          <Button
            variant="gold"
            size="md"
            leftIcon={<Plus size={18} strokeWidth={2} aria-hidden="true" focusable="false" />}
            onClick={() => navigate('/submissions/new')}
          >
            {t('dashboard.researcher.newSubmission')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          value={loading ? '—' : active}
          label={t('dashboard.researcher.activeSubmissions')}
          tone="navy"
          icon={FileText}
        />
        <StatCard
          value={loading ? '—' : revision}
          label={t('dashboard.researcher.pendingRevision')}
          tone="danger"
          icon={AlertTriangle}
        />
        <StatCard
          value={loading ? '—' : approved}
          label={t('dashboard.researcher.approvedThisYear')}
          tone="success"
          icon={CheckCircle2}
        />
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader
          title={t('dashboard.researcher.recentSubmissions')}
          actions={
            <Link
              to="/submissions"
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--lev-teal-text)' }}
            >
              {t('dashboard.researcher.viewAll')}
            </Link>
          }
        />

        {loading && (
          <div
            className="py-16 flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-label={t('common.loading')}
          >
            <Spinner size={28} label={t('common.loading')} />
          </div>
        )}

        {!loading && submissions.length === 0 && (
          <EmptyState
            icon={Inbox}
            title={t('dashboard.researcher.noSubmissions')}
            description={t('dashboard.researcher.noSubmissionsHint')}
            action={
              <Button
                variant="gold"
                size="md"
                leftIcon={<Plus size={18} strokeWidth={2} aria-hidden="true" focusable="false" />}
                onClick={() => navigate('/submissions/new')}
              >
                {t('dashboard.researcher.newSubmission')}
              </Button>
            }
          />
        )}

        {!loading && submissions.length > 0 && (
          <div className="grid md:grid-cols-5 min-h-[360px]">
            <div
              className="md:col-span-2 p-3 space-y-2 overflow-y-auto max-h-[360px]"
              style={{ borderInlineStart: '1px solid var(--border-subtle)' }}
            >
              {submissions.map(sub => (
                <SubCard
                  key={sub.id}
                  sub={sub}
                  selected={selected?.id === sub.id}
                  onClick={() => setSelected(sub)}
                  returnPath={returnPath}
                />
              ))}
            </div>

            <div
              className="md:col-span-3 hidden md:block max-h-[360px]"
              style={{ borderInlineStart: '1px solid var(--border-subtle)' }}
            >
              {selected
                ? <TimelinePane sub={selected} returnPath={returnPath} />
                : <div
                    className="h-full flex items-center justify-center text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t('dashboard.researcher.selectToView')}
                  </div>
              }
            </div>

            {selected && (
              <div
                className="md:hidden col-span-5"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <TimelinePane sub={selected} returnPath={returnPath} />
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
