/**
 * EthicFlow — Secretary Dashboard (brand refresh)
 * Lev Academic Center palette + design-system primitives: PageHeader, StatCard,
 * Card, EmptyState, Button, Badge. Shows live KPI summary cards + recent
 * submissions table.
 * Data source: GET /api/submissions/dashboard/secretary
 * IS 5568 / WCAG 2.2 AA: semantic headings, aria, responsive.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, ClipboardList, AlertCircle, Clock,
  Search, Pencil, CheckCircle2, Inbox, AlertTriangle,
} from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import {
  Button, Card, CardHeader, PageHeader, StatCard, EmptyState, Spinner,
} from '../../components/ui'

/**
 * SLA indicator — small colored dot with accessible label. Brand-var colors.
 * @param {{ slaTracking: object, labels: {breach: string, warning: string, onTime: string} }} props
 * @returns {JSX.Element|null}
 */
function SlaDot({ slaTracking, labels }) {
  if (!slaTracking) return null
  const now     = new Date()
  const due     = slaTracking.reviewDue || slaTracking.triageDue || slaTracking.revisionDue
  const msLeft  = due ? new Date(due) - now : null
  const dayLeft = msLeft ? msLeft / 86400000 : null

  let color = 'var(--status-success)'
  let label = labels.onTime
  if (slaTracking.isBreached || (dayLeft !== null && dayLeft < 0)) {
    color = 'var(--status-danger)'
    label = labels.breach
  } else if (dayLeft !== null && dayLeft < 3) {
    color = 'var(--status-warning)'
    label = labels.warning
  }

  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: color }}
      title={label}
      aria-label={label}
      role="img"
    />
  )
}

/**
 * Secretary Dashboard — live KPIs and recent submissions.
 * @returns {JSX.Element}
 */
export default function SecretaryDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const NextIcon = isRtl ? ArrowLeft : ArrowRight
  const slaLabels = {
    breach: t('dashboard.researcher.slaBreach'),
    warning: t('notifications.types.SLA_WARNING'),
    onTime: t('common.ok'),
  }
  const location = useLocation()
  const navigate = useNavigate()

  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const returnPath = `${location.pathname}${location.search}`

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      try {
        const { data } = await api.get('/submissions/dashboard/secretary')
        setStats(data.data)
      } catch (err) {
        setError(err.message || t('errors.SERVER_ERROR'))
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [t])

  const cards = stats ? [
    { label: t('dashboard.secretary.pendingReview'),  value: stats.total,           tone: 'navy',    icon: ClipboardList },
    { label: t('dashboard.secretary.slaWarning'),     value: stats.slaBreach,       tone: 'danger',  icon: AlertCircle   },
    { label: t('submission.status.IN_TRIAGE'),        value: stats.inTriage,        tone: 'warning', icon: Clock         },
    { label: t('submission.status.IN_REVIEW'),        value: stats.inReview,        tone: 'purple',  icon: Search        },
    { label: t('submission.status.PENDING_REVISION'), value: stats.pendingRevision, tone: 'warning', icon: Pencil        },
  ] : []

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('dashboard.secretary.title')}
        subtitle={t('submission.list.title')}
        actions={
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/secretary/submissions')}
            rightIcon={<NextIcon size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
          >
            {t('nav.secretarySubmissions')}
          </Button>
        }
      />

      {loading && (
        <div
          className="flex justify-center py-10"
          role="status"
          aria-live="polite"
          aria-label={t('common.loading')}
        >
          <Spinner size={28} label={t('common.loading')} />
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-sm font-medium flex items-start gap-2"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map(({ label, value, tone, icon }) => (
              <StatCard
                key={label}
                value={value}
                label={label}
                tone={tone}
                icon={icon}
              />
            ))}
          </div>

          <Card>
            <CardHeader
              title={t('submission.list.title')}
              actions={
                <Link
                  to="/secretary/submissions"
                  className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  <span>{t('common.viewAll')}</span>
                  <NextIcon size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                </Link>
              }
            />

            {stats.recentSubmissions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t('submission.list.empty')}
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-right"
                        style={{
                          background: 'var(--surface-sunken)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <th scope="col" className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t('submission.table.id')}
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t('submission.table.title')}
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t('common.researcher')}
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {t('submission.table.status')}
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-muted)' }}>
                          SLA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSubmissions.map(sub => (
                        <tr
                          key={sub.id}
                          className="transition-colors hover:bg-gray-50"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs">
                            <Link
                              to={`/secretary/submissions/${sub.id}`}
                              state={{ from: returnPath }}
                              className="hover:underline font-semibold"
                              style={{ color: 'var(--lev-teal-text)' }}
                            >
                              {sub.applicationId}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--text-primary)' }}>
                            {sub.title}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                            {sub.author?.fullName}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={sub.status} />
                          </td>
                          <td className="px-4 py-2.5">
                            <SlaDot slaTracking={sub.slaTracking} labels={slaLabels} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden">
                  {stats.recentSubmissions.map(sub => (
                    <Link
                      key={sub.id}
                      to={`/secretary/submissions/${sub.id}`}
                      state={{ from: returnPath }}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {sub.applicationId}
                        </p>
                        <SlaDot slaTracking={sub.slaTracking} labels={slaLabels} />
                      </div>
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {sub.title}
                      </p>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {sub.author?.fullName}
                        </p>
                        <StatusBadge status={sub.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
