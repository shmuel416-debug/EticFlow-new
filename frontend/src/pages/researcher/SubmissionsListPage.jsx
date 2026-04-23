/**
 * EthicFlow — Researcher Submissions List Page
 * Shows all submissions created by the logged-in researcher.
 * Filters by status + search + pagination. Uses the EthicFlow design system
 * (PageHeader, Card, Table, Button, Input, Select) with the Lev palette,
 * lucide-react icons, and IS 5568 / WCAG 2.2 AA accessibility.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, Filter, FilePlus2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import useStatusConfig from '../../hooks/useStatusConfig'
import {
  Button, Card, CardHeader, CardBody, Input, Select, PageHeader, Table,
  AccessibleIcon,
} from '../../components/ui'

/**
 * Resolves the route for a submission depending on its status.
 * Drafts and pending-revision go to the editor; everything else to the detail page.
 * @param {object} sub
 * @returns {string}
 */
function submissionRoute(sub) {
  if (sub.status === 'DRAFT' || sub.status === 'PENDING_REVISION') {
    return `/submissions/${sub.id}/edit`
  }
  return `/submissions/${sub.id}`
}

/**
 * Formats an ISO date to he-IL short date.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL')
}

/**
 * Researcher submissions list page.
 * Behaviour (fetch / filters / pagination / routing) is identical to the
 * previous version — this refactor only changes presentation.
 * @returns {JSX.Element}
 */
export default function ResearcherSubmissionsListPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const location = useLocation()
  const navigate = useNavigate()
  const { statuses } = useStatusConfig()

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const returnPath = `${location.pathname}${location.search}`

  useEffect(() => {
    let cancelled = false

    async function loadSubmissions() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({ page: page.toString(), limit: '10' })
        if (searchTerm) params.set('search', searchTerm)
        if (statusFilter !== 'ALL') params.set('status', statusFilter)

        const { data } = await api.get(`/submissions?${params}`)
        if (!cancelled) {
          setSubmissions(data.submissions || data.data || [])
          const total = data.total ?? data.pagination?.total ?? 0
          setTotalPages(Math.max(1, Math.ceil(total / 10)))
        }
      } catch {
        if (!cancelled) setError(t('submission.list.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSubmissions()
    return () => { cancelled = true }
  }, [page, searchTerm, statusFilter, t])

  const statusCodes = statuses.map((status) => status.code)

  const columns = [
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
      key: 'applicationId',
      header: t('submission.list.colId'),
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {row.applicationId}
        </span>
      ),
    },
    {
      key: 'submittedAt',
      header: t('submission.list.colDate'),
      render: (row) => formatDate(row.submittedAt),
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: t('submission.list.colStatus'),
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('dashboard.researcher.recentSubmissions')}
        actions={
          <Button
            variant="gold"
            leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            onClick={() => navigate('/submissions/new')}
          >
            {t('nav.newSubmission')}
          </Button>
        }
      />

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
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="flex-1">
              <label htmlFor="researcher-submissions-search" className="lev-sr-only">
                {t('submission.list.searchPlaceholder')}
              </label>
              <Input
                id="researcher-submissions-search"
                icon={Search}
                type="search"
                placeholder={t('submission.list.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
                aria-label={t('submission.list.searchPlaceholder')}
              />
            </div>
            <div className="md:w-64 flex items-center gap-2">
              <AccessibleIcon icon={Filter} size={18} decorative style={{ color: 'var(--text-muted)' }} />
              <label htmlFor="researcher-submissions-status" className="lev-sr-only">
                {t('submission.list.filterLabel')}
              </label>
              <Select
                id="researcher-submissions-status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                aria-label={t('submission.list.filterLabel')}
              >
                <option value="ALL">{t('submission.list.filterAll')}</option>
                {statusCodes.map((s) => (
                  <option key={s} value={s}>{t(`submission.status.${s}`)}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardBody padded={false}>
          <Table
            columns={columns}
            rows={submissions}
            rowKey={(r) => r.id}
            caption={t('dashboard.researcher.recentSubmissions')}
            loading={loading}
            emptyTitle={t('submission.list.noResults')}
            emptyDescription={t('dashboard.researcher.noSubmissionsHint')}
            emptyAction={
              <Button
                variant="gold"
                leftIcon={<FilePlus2 size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                onClick={() => navigate('/submissions/new')}
              >
                {t('nav.newSubmission')}
              </Button>
            }
            onRowClick={(row) => navigate(submissionRoute(row), { state: { from: returnPath } })}
            rowAriaLabel={(row) => `${row.title} — ${row.applicationId}`}
          />
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <nav
          aria-label={t('common.nextPage')}
          className="flex justify-center items-center gap-3 pt-2"
        >
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<PrevIcon size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.prev')}
          </Button>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<NextIcon size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t('common.next')}
          </Button>
        </nav>
      )}
    </div>
  )
}
