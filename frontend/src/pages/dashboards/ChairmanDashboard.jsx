/**
 * EthicFlow — Chairman Dashboard (brand refresh)
 * Lev Academic Center palette + design-system primitives: PageHeader, StatCard,
 * Card, EmptyState, Button, Badge. Kanban-style view of submissions by
 * status: IN_REVIEW | APPROVED | REJECTED.
 * Data source: GET /api/submissions (filtered by status).
 * IS 5568 / WCAG 2.2 AA: semantic headings, aria, responsive.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Scale, Search, CheckCircle2, XCircle, Inbox,
  AlertTriangle,
} from 'lucide-react'
import api from '../../services/api'
import {
  Badge, Button, Card, PageHeader, StatCard, EmptyState, Spinner,
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
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color }}
      title={label}
      aria-label={label}
      role="img"
    />
  )
}

/**
 * Single submission card inside a Kanban column.
 * @param {{ submission: object, linkPrefix: string, slaLabels: object, statusLabel: string }} props
 * @returns {JSX.Element}
 */
function KanbanCard({ submission, linkPrefix, slaLabels, statusLabel }) {
  return (
    <Link
      to={`${linkPrefix}/${submission.id}`}
      className="block p-3 transition-shadow hover:shadow"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
      }}
      aria-label={`${submission.applicationId} — ${submission.title} — ${statusLabel}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <SlaDot slaTracking={submission.slaTracking} labels={slaLabels} />
        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {submission.applicationId}
        </p>
      </div>
      <p
        className="text-sm font-medium line-clamp-2 mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {submission.title}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {submission.author?.fullName}
      </p>
    </Link>
  )
}

/**
 * Chairman Dashboard — Kanban with live submission data.
 * @returns {JSX.Element}
 */
export default function ChairmanDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const NextIcon = isRtl ? ArrowLeft : ArrowRight
  const slaLabels = {
    breach: t('dashboard.researcher.slaBreach'),
    warning: t('notifications.types.SLA_WARNING'),
    onTime: t('common.ok'),
  }

  const navigate = useNavigate()

  const [inReview, setInReview] = useState([])
  const [approved, setApproved] = useState([])
  const [rejected, setRejected] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get('/submissions?statuses=IN_REVIEW&limit=50'),
          api.get('/submissions?statuses=APPROVED&limit=20'),
          api.get('/submissions?statuses=REJECTED&limit=20'),
        ])
        setInReview(r1.data.data ?? [])
        setApproved(r2.data.data ?? [])
        setRejected(r3.data.data ?? [])
      } catch (err) {
        setError(err.message || t('errors.SERVER_ERROR'))
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [t])

  const columns = [
    {
      key: 'inReview', label: t('submission.status.IN_REVIEW'),
      items: inReview, tone: 'purple', icon: Search,
      link: '/chairman/queue',
      statuses: 'IN_REVIEW',
    },
    {
      key: 'approved', label: t('submission.status.APPROVED'),
      items: approved, tone: 'success', icon: CheckCircle2,
      link: '/chairman/queue',
      statuses: 'APPROVED',
    },
    {
      key: 'rejected', label: t('submission.status.REJECTED'),
      items: rejected, tone: 'danger', icon: XCircle,
      link: '/chairman/queue',
      statuses: 'REJECTED',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('dashboard.chairman.title')}
        actions={
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/chairman/queue')}
            leftIcon={<Scale size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            rightIcon={<NextIcon size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
          >
            {t('nav.chairmanQueue')}
          </Button>
        }
      />

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/chairman/queue?statuses=IN_REVIEW" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            <StatCard
              value={inReview.length}
              label={t('submission.status.IN_REVIEW')}
              tone="purple"
              icon={Search}
              hint={t('dashboard.chairman.openFilteredList')}
            />
          </Link>
          <Link to="/chairman/queue?statuses=APPROVED" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            <StatCard
              value={approved.length}
              label={t('submission.status.APPROVED')}
              tone="success"
              icon={CheckCircle2}
              hint={t('dashboard.chairman.openFilteredList')}
            />
          </Link>
          <Link to="/chairman/queue?statuses=REJECTED" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
            <StatCard
              value={rejected.length}
              label={t('submission.status.REJECTED')}
              tone="danger"
              icon={XCircle}
              hint={t('dashboard.chairman.openFilteredList')}
            />
          </Link>
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

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => {
            const ColIcon = col.icon
            return (
              <Card key={col.key} as="section" aria-label={col.label}>
                <div
                  className="flex items-center justify-between gap-2 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ColIcon
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                      focusable="false"
                      style={{
                        color:
                          col.tone === 'purple'  ? 'var(--lev-purple)'     :
                          col.tone === 'success' ? 'var(--status-success)' :
                          'var(--status-danger)',
                      }}
                    />
                    <Link to={`${col.link}?statuses=${col.statuses}`} className="font-bold text-sm truncate hover:underline" style={{ color: 'var(--lev-navy)' }}>
                      {col.label}
                    </Link>
                  </div>
                  <Badge tone={col.tone} size="sm">
                    {col.items.length}
                  </Badge>
                </div>

                <div
                  className="p-3 space-y-2 min-h-[120px]"
                  style={{ background: 'var(--surface-sunken)' }}
                >
                  {col.items.length === 0 && (
                    <EmptyState
                      icon={Inbox}
                      title={t('submission.list.empty')}
                      className="py-8"
                    />
                  )}
                  {col.items.map(sub => (
                    <KanbanCard
                      key={sub.id}
                      submission={sub}
                      linkPrefix={col.link}
                      slaLabels={slaLabels}
                      statusLabel={col.label}
                    />
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
