/**
 * EthicFlow — Secretary Submissions List Page
 * Displays all submissions with search, status filter, and pagination.
 * Accessible to SECRETARY and ADMIN roles.
 * IS 5568: table scope, caption, min touch targets.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'

const STATUS_FILTERS = ['', 'SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'IN_REVIEW', 'PENDING_REVISION', 'APPROVED', 'REJECTED']

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
 */
export default function SubmissionsListPage() {
  const { t }            = useTranslation()
  const [submissions,    setSubmissions]    = useState([])
  const [pagination,     setPagination]     = useState({ page: 1, pages: 1, total: 0 })
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [page,           setPage]           = useState(1)

  /**
   * Fetches submissions from API with current filters.
   */
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

  /** Resets page to 1 when filters change. */
  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1) }
  }

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.list.pageTitle')}
        </h1>
        <p className="text-sm text-gray-500">{pagination.total} {t('submission.table.status')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          data-testid="secretary-submissions-search"
          value={search}
          onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
          placeholder={t('submission.list.searchPlaceholder')}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ minHeight: '44px' }}
          aria-label={t('submission.list.searchPlaceholder')}
        />
        <select
          value={statusFilter}
          data-testid="secretary-submissions-status-filter"
          onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
          style={{ minHeight: '44px' }}
          aria-label={t('submission.list.filterLabel')}
        >
          <option value="">{t('submission.list.filterAll')}</option>
          {STATUS_FILTERS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{t(`submission.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm" aria-label={t('submission.list.pageTitle')}>
          <caption className="sr-only">{t('submission.list.pageTitle')}</caption>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colId')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colTitle')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colAuthor')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colStatus')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colDate')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colReviewer')}</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">{t('submission.list.viewDetail')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
            )}
            {!loading && submissions.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('submission.list.noResults')}</td></tr>
            )}
            {!loading && submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{sub.applicationId}</td>
                <td className="px-4 py-3 font-medium max-w-xs truncate">{sub.title}</td>
                <td className="px-4 py-3 text-gray-600">{sub.author?.fullName ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(sub.submittedAt)}</td>
                <td className="px-4 py-3 text-gray-500">{sub.reviewer?.fullName ?? '—'}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/secretary/submissions/${sub.id}`}
                    data-testid={`secretary-open-submission-${sub.id}`}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--lev-navy)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                  >
                    {t('submission.list.viewDetail')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-40" style={{ minHeight: '44px' }}>
            {'<'}
          </button>
          <span className="text-sm text-gray-600">{page} / {pagination.pages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-40" style={{ minHeight: '44px' }}>
            {'>'}
          </button>
        </div>
      )}
    </main>
  )
}
