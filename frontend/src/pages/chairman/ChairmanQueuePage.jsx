/**
 * EthicFlow — Chairman Queue Page
 * Lists submissions in IN_REVIEW status awaiting final decision.
 * Uses the EthicFlow design system (PageHeader, Card, Table) with the Lev
 * palette and lucide-react icons. IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import {
  Card, CardBody, PageHeader, Table,
} from '../../components/ui'

/**
 * Formats ISO date to locale short date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL')
}

/**
 * Chairman's queue of submissions pending final decision.
 * @returns {JSX.Element}
 */
export default function ChairmanQueuePage() {
  const { t }         = useTranslation()
  const location      = useLocation()
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const [submissions, setSubmissions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const statusesParam = searchParams.get('statuses') || 'IN_REVIEW'
  const selectedStatuses = useMemo(
    () => statusesParam
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
    [statusesParam]
  )
  const selectedStatusesKey = useMemo(
    () => selectedStatuses.join(','),
    [selectedStatuses]
  )
  const returnPath    = `${location.pathname}${location.search}`

  useEffect(() => {
    async function fetchQueue() {
      try {
        const params = new URLSearchParams()
        params.set('statuses', selectedStatusesKey)
        const { data } = await api.get(`/submissions?${params.toString()}`)
        setSubmissions(data.data)
      } catch {
        setError(t('chairman.queue.loadError'))
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [t, selectedStatuses, selectedStatusesKey])

  const columns = [
    {
      key: 'applicationId',
      header: t('submission.list.colId'),
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {row.applicationId}
        </span>
      ),
    },
    {
      key: 'title',
      header: t('submission.list.colTitle'),
      render: (row) => (
        <span className="font-medium" style={{ color: 'var(--lev-navy)' }}>
          {row.title}
        </span>
      ),
    },
    {
      key: 'author',
      header: t('submission.list.colAuthor'),
      render: (row) => row.author?.fullName ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: t('submission.list.colStatus'),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'reviewer',
      header: t('submission.list.colReviewer'),
      render: (row) => row.reviewer?.fullName ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'reviewerRecommendation',
      header: t('chairman.queue.colRecommendation'),
      render: (row) => (
        row.reviewerRecommendation
          ? t(`reviewer.checklist.recommendation.${row.reviewerRecommendation}`)
          : '—'
      ),
      hideOnMobile: true,
    },
    {
      key: 'submittedAt',
      header: t('submission.list.colDate'),
      render: (row) => formatDate(row.submittedAt),
      hideOnMobile: true,
    },
  ]

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <PageHeader title={t('chairman.queue.pageTitle')} />

      {location.state?.statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm font-medium"
          style={{
            background: 'var(--status-success-50)',
            color: 'var(--status-success)',
            border: '1px solid var(--status-success)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
          }}
        >
          {location.state.statusMessage}
        </div>
      )}

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

      <Card>
        <CardBody padded={false}>
          <Table
            columns={columns}
            rows={submissions}
            rowKey={(r) => r.id}
            caption={t('chairman.queue.pageTitle')}
            loading={loading}
            emptyTitle={t('chairman.queue.noItems')}
            onRowClick={(row) => navigate(`/chairman/queue/${row.id}`, { state: { from: returnPath } })}
            rowAriaLabel={(row) => `${row.applicationId} — ${row.title} — ${t(`submission.status.${row.status}`)}`}
          />
        </CardBody>
      </Card>
    </main>
  )
}
