/**
 * EthicFlow — Secretary Submissions List Page
 * Displays all submissions with search, status filter, and pagination.
 * Accessible to SECRETARY and ADMIN roles.
 * Uses the EthicFlow design system primitives (PageHeader, Card, Table,
 * Button, Input, Select) with the Lev palette and lucide-react icons.
 * IS 5568 / WCAG 2.2 AA.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import useStatusConfig from '../../hooks/useStatusConfig'
import {
  Button, Card, CardHeader, CardBody, Input, Select, PageHeader, Table,
  AccessibleIcon,
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
 * Secretary view: paginated list of all submissions with search + status filter.
 * @returns {JSX.Element}
 */
export default function SubmissionsListPage() {
  const { t, i18n }   = useTranslation()
  const isRtl         = i18n.dir() === 'rtl'
  const location      = useLocation()
  const navigate      = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { statuses }  = useStatusConfig()

  const [submissions,  setSubmissions]  = useState([])
  const [pagination,   setPagination]   = useState({ page: 1, pages: 1, total: 0 })
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [page,         setPage]         = useState(1)
  const returnPath                      = `${location.pathname}${location.search}`

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page })
      if (search)       params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const { data } = await api.get(`/submissions?${params}`)
      setSubmissions(data.data)
      setPagination(data.pagination)
    } catch {
      setError(t('submission.list.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, t])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  useEffect(() => {
    const nextParams = new URLSearchParams(location.search)
    if (statusFilter) nextParams.set('status', statusFilter)
    else nextParams.delete('status')
    if (nextParams.toString() === searchParams.toString()) return
    setSearchParams(nextParams, { replace: true })
  }, [location.search, searchParams, setSearchParams, statusFilter])

  /**
   * Resets page to 1 whenever a filter changes.
   * @param {(v: any) => void} setter
   * @returns {(val: any) => void}
   */
  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1) }
  }

  const statusFilters = statuses
    .filter((status) => status.code !== 'DRAFT')
    .map((status) => status.code)

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
      key: 'submittedAt',
      header: t('submission.list.colDate'),
      render: (row) => formatDate(row.submittedAt),
      hideOnMobile: true,
    },
    {
      key: 'reviewer',
      header: t('submission.list.colReviewer'),
      render: (row) => row.reviewer?.fullName ?? '—',
      hideOnMobile: true,
    },
  ]

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <PageHeader
        title={t('submission.list.pageTitle')}
        subtitle={`${pagination.total} ${t('common.showing')}`}
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
              <label htmlFor="secretary-submissions-search" className="lev-sr-only">
                {t('submission.list.searchPlaceholder')}
              </label>
              <Input
                id="secretary-submissions-search"
                icon={Search}
                type="search"
                data-testid="secretary-submissions-search"
                value={search}
                onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
                placeholder={t('submission.list.searchPlaceholder')}
                aria-label={t('submission.list.searchPlaceholder')}
              />
            </div>
            <div className="md:w-64 flex items-center gap-2">
              <AccessibleIcon icon={Filter} size={18} decorative style={{ color: 'var(--text-muted)' }} />
              <label htmlFor="secretary-submissions-status-filter" className="lev-sr-only">
                {t('submission.list.filterLabel')}
              </label>
              <Select
                id="secretary-submissions-status-filter"
                data-testid="secretary-submissions-status-filter"
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
                aria-label={t('submission.list.filterLabel')}
              >
                <option value="">{t('submission.list.filterAll')}</option>
                {statusFilters.map((s) => (
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
            caption={t('submission.list.pageTitle')}
            loading={loading}
            emptyTitle={t('submission.list.noResults')}
            onRowClick={(row) => navigate(`/secretary/submissions/${row.id}`, { state: { from: returnPath } })}
            rowAriaLabel={(row) => `${row.title} — ${row.applicationId}`}
          />
        </CardBody>
      </Card>

      {pagination.pages > 1 && (
        <nav
          aria-label={t('common.nextPage')}
          className="flex items-center justify-center gap-3"
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
            {page} / {pagination.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            rightIcon={<NextIcon size={16} strokeWidth={1.75} aria-hidden="true" focusable="false" />}
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
          >
            {t('common.next')}
          </Button>
        </nav>
      )}
    </main>
  )
}
