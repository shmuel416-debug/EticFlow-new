/**
 * EthicFlow — Researcher Submissions List Page
 * Shows all submissions created by the logged-in researcher.
 * Filters by status, search, pagination. Lev palette, mobile-first, IS 5568.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/submissions/StatusBadge'

export default function ResearcherSubmissionsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadSubmissions() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter !== 'ALL' && { status: statusFilter }),
        })

        const { data } = await api.get(`/submissions?${params}`)
        if (!cancelled) {
          setSubmissions(data.submissions || [])
          setTotalPages(Math.ceil((data.total || 0) / 10))
        }
      } catch (err) {
        if (!cancelled) setError(t('common.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSubmissions()
    return () => { cancelled = true }
  }, [page, searchTerm, statusFilter, t])

  const statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PENDING_REVISION']

  if (loading && !submissions.length) {
    return (
      <div className="flex flex-1 items-center justify-center py-24" role="status" aria-live="polite">
        <p className="text-sm" style={{ color: 'var(--lev-teal-text)' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('submission.list.title', 'My Submissions')}
        </h1>
        <button type="button" onClick={() => navigate('/submissions/new')}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl hover:opacity-90"
          style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
          {t('submission.new.btn', 'New Submission')}
        </button>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3 md:flex md:gap-3 md:space-y-0">
        <input type="text" placeholder={t('common.search', 'Search...')}
          value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="flex-1 px-3 py-2 text-sm border rounded-lg" style={{ borderColor: '#e5e7eb' }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border rounded-lg" style={{ borderColor: '#e5e7eb' }}>
          {statuses.map(s => (
            <option key={s} value={s}>{t(`submission.status.${s.toLowerCase()}`, s)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !submissions.length && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">{t('submission.list.empty', 'No submissions found')}</p>
        </div>
      )}

      {/* List */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map(sub => (
            <Link key={sub.id} to={`/submissions/${sub.id}`}
              className="block p-4 border rounded-xl hover:shadow-md transition-shadow"
              style={{ borderColor: '#e5e7eb' }}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>
                    {sub.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {sub.applicationId} · {new Date(sub.submittedAt).toLocaleDateString()}
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
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50" style={{ borderColor: '#e5e7eb' }}>
            {t('common.prev', 'Previous')}
          </button>
          <span className="px-3 py-2 text-sm">{page} / {totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50" style={{ borderColor: '#e5e7eb' }}>
            {t('common.next', 'Next')}
          </button>
        </div>
      )}
    </div>
  )
}
