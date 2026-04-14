/**
 * EthicFlow — Secretary Dashboard (real data)
 * Shows live KPI summary cards + recent submissions table.
 * Data source: GET /api/submissions/dashboard/secretary
 * IS 5568 / WCAG 2.2 AA: semantic headings, aria, responsive.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'

/** Submission status badge (inline, no import needed) */
function StatusBadge({ status }) {
  const { t } = useTranslation()
  const colors = {
    DRAFT:            'bg-gray-100 text-gray-600',
    SUBMITTED:        'bg-blue-100 text-blue-700',
    IN_TRIAGE:        'bg-yellow-100 text-yellow-700',
    ASSIGNED:         'bg-purple-100 text-purple-700',
    IN_REVIEW:        'bg-indigo-100 text-indigo-700',
    PENDING_REVISION: 'bg-orange-100 text-orange-700',
    APPROVED:         'bg-green-100 text-green-700',
    REJECTED:         'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {t(`submission.status.${status}`, status)}
    </span>
  )
}

/** SLA dot indicator */
function SlaDot({ slaTracking }) {
  if (!slaTracking) return null
  const now     = new Date()
  const due     = slaTracking.reviewDue || slaTracking.triageDue || slaTracking.revisionDue
  const msLeft  = due ? new Date(due) - now : null
  const dayLeft = msLeft ? msLeft / 86400000 : null

  if (slaTracking.isBreached || (dayLeft !== null && dayLeft < 0)) {
    return <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" title="SLA breach" aria-label="SLA הופר" />
  }
  if (dayLeft !== null && dayLeft < 3) {
    return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" title="SLA warning" aria-label="SLA קרוב" />
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" title="On time" aria-label="SLA תקין" />
}

/**
 * Secretary Dashboard — live KPIs and recent submissions.
 * @returns {JSX.Element}
 */
export default function SecretaryDashboard() {
  const { t } = useTranslation()

  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      try {
        const { data } = await api.get('/submissions/dashboard/secretary')
        setStats(data.data)
      } catch (err) {
        setError(err.message || t('errors.SERVER_ERROR'))
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [t])

  const cards = stats ? [
    { label: t('dashboard.secretary.pendingReview'),      value: stats.total,           color: 'var(--lev-navy)' },
    { label: t('dashboard.secretary.slaWarning'),         value: stats.slaBreach,       color: '#dc2626' },
    { label: t('submission.status.IN_TRIAGE'),            value: stats.inTriage,        color: '#d97706' },
    { label: t('submission.status.IN_REVIEW'),            value: stats.inReview,        color: '#7c3aed' },
    { label: t('submission.status.PENDING_REVISION'),     value: stats.pendingRevision, color: '#ea580c' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('dashboard.secretary.title')}
        </h1>
        <Link
          to="/secretary/submissions"
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 min-h-[44px] flex items-center"
        >
          {t('nav.secretarySubmissions')} →
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div role="status" aria-label={t('common.loading')}
               className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">{error}</div>}

      {/* KPI cards */}
      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Recent submissions table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: 'var(--lev-navy)' }}>
                {t('submission.list.title')}
              </h2>
              <Link to="/secretary/submissions" className="text-xs text-blue-600 hover:underline">
                {t('common.viewAll')} →
              </Link>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right border-b border-gray-50 bg-gray-50">
                    <th scope="col" className="px-4 py-2 font-semibold text-gray-500">{t('submission.table.id')}</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-gray-500">{t('submission.table.title')}</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-gray-500">{t('common.researcher')}</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-gray-500">{t('submission.table.status')}</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-gray-500">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-gray-600">
                        <Link to={`/secretary/submissions/${sub.id}`} className="hover:underline text-blue-600">
                          {sub.applicationId}
                        </Link>
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate">{sub.title}</td>
                      <td className="px-4 py-2 text-gray-600">{sub.author?.fullName}</td>
                      <td className="px-4 py-2"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-2"><SlaDot slaTracking={sub.slaTracking} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {stats.recentSubmissions.map(sub => (
                <Link key={sub.id} to={`/secretary/submissions/${sub.id}`}
                  className="block p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-mono text-xs text-gray-500">{sub.applicationId}</p>
                    <SlaDot slaTracking={sub.slaTracking} />
                  </div>
                  <p className="text-sm font-medium truncate">{sub.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">{sub.author?.fullName}</p>
                    <StatusBadge status={sub.status} />
                  </div>
                </Link>
              ))}
            </div>

            {stats.recentSubmissions.length === 0 && (
              <p className="text-center py-8 text-gray-500 text-sm">{t('submission.list.empty')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
