/**
 * EthicFlow — Researcher Submissions List Page
 * Shows all submissions created by the logged-in researcher.
 * Filters by status, search, pagination. Lev palette, mobile-first, IS 5568.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'
import useStatusConfig from '../../hooks/useStatusConfig'

function submissionRoute(sub) {
  if (sub.status === 'DRAFT' || sub.status === 'PENDING_REVISION') {
    return `/submissions/${sub.id}/edit`
  }
  return `/submissions/${sub.id}`
}

export default function ResearcherSubmissionsListPage() {
  const { t } = useTranslation()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('dashboard.researcher.recentSubmissions')}
        </h1>
        <button type="button" onClick={() => navigate('/submissions/new')}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
          + {t('nav.newSubmission')}
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          placeholder={t('submission.list.searchPlaceholder')}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="flex-1 px-3 py-2 text-sm border rounded-lg"
          style={{ borderColor: '#e5e7eb', minHeight: '44px' }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border rounded-lg"
          style={{ borderColor: '#e5e7eb', minHeight: '44px' }}
        >
          <option value="ALL">{t('submission.list.filterAll')}</option>
          {statusCodes.map(s => (
            <option key={s} value={s}>{t(`submission.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12" role="status" aria-live="polite">
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && submissions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3" aria-hidden="true">📋</p>
          <p className="text-gray-500 text-sm">{t('submission.list.noResults')}</p>
          <button type="button" onClick={() => navigate('/submissions/new')}
            className="mt-4 px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90"
            style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
            + {t('nav.newSubmission')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map(sub => (
            <Link
              key={sub.id}
              to={submissionRoute(sub)}
              state={{ from: returnPath }}
              className="block p-4 border rounded-xl hover:shadow-md transition-shadow bg-white"
              style={{ borderColor: '#e5e7eb' }}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--lev-navy)' }}>
                    {sub.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {sub.applicationId}
                    {sub.submittedAt && ` · ${new Date(sub.submittedAt).toLocaleDateString('he-IL')}`}
                  </p>
                </div>
                <StatusBadge status={sub.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            style={{ borderColor: '#e5e7eb', minHeight: '44px' }}>
            {t('common.prev')}
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            style={{ borderColor: '#e5e7eb', minHeight: '44px' }}>
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}
