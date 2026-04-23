/**
 * EthicFlow — Reviewer Assignments Page
 * Lists submissions assigned to the authenticated reviewer with status ASSIGNED.
 * Uses the EthicFlow design system (PageHeader, Card, Table) with the Lev
 * palette and lucide-react icons. IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import {
  Card, CardBody, PageHeader, Table,
} from '../../components/ui'

/**
 * Formats ISO date string to locale date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL')
}

/**
 * Reviewer's list of assigned submissions awaiting review.
 * @returns {JSX.Element}
 */
export default function AssignmentsPage() {
  const { t }         = useTranslation()
  const location      = useLocation()
  const navigate      = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const returnPath    = `${location.pathname}${location.search}`

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const { data } = await api.get('/submissions?status=ASSIGNED&assignedToMe=true')
        setSubmissions(data.data)
      } catch {
        setError(t('reviewer.assignments.loadError'))
      } finally {
        setLoading(false)
      }
    }
    fetchAssignments()
  }, [t])

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
      key: 'status',
      header: t('submission.list.colStatus'),
      render: (row) => <StatusBadge status={row.status} />,
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
      <PageHeader title={t('reviewer.assignments.pageTitle')} />

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
            caption={t('reviewer.assignments.pageTitle')}
            loading={loading}
            emptyTitle={t('reviewer.assignments.noAssignments')}
            onRowClick={(row) => navigate(`/reviewer/assignments/${row.id}`, { state: { from: returnPath } })}
            rowAriaLabel={(row) => `${row.title} — ${row.applicationId}`}
          />
        </CardBody>
      </Card>
    </main>
  )
}
