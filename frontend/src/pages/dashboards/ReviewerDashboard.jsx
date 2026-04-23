/**
 * EthicFlow — Reviewer Dashboard
 * Lev palette + design-system primitives. KPIs: assigned submissions,
 * closed outcomes where the reviewer was assignee (approved / rejected / continued).
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ClipboardList, CheckCircle2, ArrowRight, ListTodo } from 'lucide-react'
import api from '../../services/api'
import { Card, CardBody, CardHeader, PageHeader, StatCard } from '../../components/ui'

/** Secondary outline style matching design-system Button (for router Links). */
const LINK_STYLE = {
  background: '#fff',
  color: 'var(--lev-navy)',
  border: '1px solid var(--border-default)',
  minHeight: 44,
  padding: '0 16px',
  fontSize: 14,
  borderRadius: 'var(--radius-xl)',
  textDecoration: 'none',
  fontWeight: 600,
}

/**
 * Reviewer dashboard with live assignment counts.
 * @returns {JSX.Element}
 */
export default function ReviewerDashboard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [assignedTotal, setAssignedTotal] = useState(null)
  const [completedTotal, setCompletedTotal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const [assignedR, completedR] = await Promise.allSettled([
        api.get('/submissions?status=ASSIGNED&assignedToMe=true&page=1&limit=1'),
        api.get('/submissions?statuses=APPROVED,REJECTED,CONTINUED&assignedToMe=true&page=1&limit=1'),
      ])
      if (cancelled) return

      if (assignedR.status === 'fulfilled') {
        setAssignedTotal(assignedR.value.data.pagination?.total ?? 0)
      } else {
        setAssignedTotal(null)
      }
      if (completedR.status === 'fulfilled') {
        setCompletedTotal(completedR.value.data.pagination?.total ?? 0)
      } else {
        setCompletedTotal(null)
      }

      if (assignedR.status === 'rejected' || completedR.status === 'rejected') {
        setError(t('dashboard.reviewer.loadError'))
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [t])

  const fmt = (n) => (loading ? '—' : n === null ? '—' : n)

  return (
    <div className="space-y-5">
      <PageHeader title={t('dashboard.reviewer.title')} />

      {error && (
        <div
          role="alert"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          value={fmt(assignedTotal)}
          label={t('dashboard.reviewer.assignedToMe')}
          tone="purple"
          icon={ClipboardList}
          aria-busy={loading}
        />
        <StatCard
          value={fmt(completedTotal)}
          label={t('dashboard.reviewer.completedReviews')}
          hint={t('dashboard.reviewer.completedReviewsHint')}
          tone="success"
          icon={CheckCircle2}
          aria-busy={loading}
        />
      </div>

      <Card>
        <CardHeader title={t('dashboard.reviewer.openAssignments')} />
        <CardBody>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard.reviewer.openAssignmentsHint')}
          </p>
          <Link
            to="/reviewer/assignments"
            className="inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={LINK_STYLE}
          >
            <ListTodo className="w-4 h-4 shrink-0" aria-hidden />
            {t('reviewer.assignments.pageTitle')}
            <ArrowRight className="w-4 h-4 shrink-0 rtl:rotate-180" aria-hidden />
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}
