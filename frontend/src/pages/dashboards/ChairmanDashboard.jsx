/**
 * EthicFlow — Chairman Dashboard (real data)
 * Kanban-style view of submissions by status: IN_REVIEW | awaiting decision | decided.
 * Data source: GET /api/submissions (filtered by status).
 * IS 5568 / WCAG 2.2 AA: semantic headings, aria, responsive cards.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/** SLA indicator dot */
function SlaDot({ slaTracking }) {
  if (!slaTracking) return null
  const now     = new Date()
  const due     = slaTracking.reviewDue || slaTracking.triageDue || slaTracking.revisionDue
  const msLeft  = due ? new Date(due) - now : null
  const dayLeft = msLeft ? msLeft / 86400000 : null

  if (slaTracking.isBreached || (dayLeft !== null && dayLeft < 0)) {
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block flex-shrink-0" title="SLA breach" aria-label="SLA הופר" />
  }
  if (dayLeft !== null && dayLeft < 3) {
    return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" title="SLA warning" aria-label="SLA קרוב" />
  }
  return <span className="w-2 h-2 rounded-full bg-green-400 inline-block flex-shrink-0" title="On time" aria-label="SLA תקין" />
}

/** Kanban column card */
function KanbanCard({ submission, linkPrefix }) {
  return (
    <Link
      to={`${linkPrefix}/${submission.id}`}
      className="block bg-white rounded-lg border border-gray-100 p-3 hover:shadow-md
                 transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={submission.applicationId}
    >
      <div className="flex items-start gap-2 mb-1">
        <SlaDot slaTracking={submission.slaTracking} />
        <p className="font-mono text-xs text-gray-500 flex-shrink-0">{submission.applicationId}</p>
      </div>
      <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{submission.title}</p>
      <p className="text-xs text-gray-500">{submission.author?.fullName}</p>
    </Link>
  )
}

/**
 * Chairman Dashboard — Kanban with live submission data.
 * @returns {JSX.Element}
 */
export default function ChairmanDashboard() {
  const { t } = useTranslation()

  const [inReview, setInReview]     = useState([])
  const [approved, setApproved]     = useState([])
  const [rejected, setRejected]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

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
    { key: 'inReview', label: t('submission.status.IN_REVIEW'),  items: inReview,  color: '#7c3aed', link: '/chairman/queue' },
    { key: 'approved', label: t('submission.status.APPROVED'),   items: approved,  color: '#16a34a', link: '/chairman/queue' },
    { key: 'rejected', label: t('submission.status.REJECTED'),   items: rejected,  color: '#dc2626', link: '/chairman/queue' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('dashboard.chairman.title')}
        </h1>
        <Link
          to="/chairman/queue"
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 min-h-[44px] flex items-center"
        >
          {t('nav.chairmanQueue')} →
        </Link>
      </div>

      {/* Summary stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">{t('submission.status.IN_REVIEW')}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#7c3aed' }}>{inReview.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500">{t('submission.status.APPROVED')}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#16a34a' }}>{approved.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500">{t('submission.status.REJECTED')}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#dc2626' }}>{rejected.length}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div role="status" aria-label={t('common.loading')}
               className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Kanban board — desktop: 3 columns, mobile: stacked */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => (
            <section key={col.key} aria-label={col.label}>
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: col.color }} aria-hidden="true" />
                <h2 className="font-semibold text-sm" style={{ color: col.color }}>{col.label}</h2>
                <span className="text-xs text-gray-400 ms-auto">{col.items.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2 bg-gray-50 rounded-xl p-2 min-h-[120px]">
                {col.items.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">{t('submission.list.empty')}</p>
                )}
                {col.items.map(sub => (
                  <KanbanCard key={sub.id} submission={sub} linkPrefix={col.link} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
