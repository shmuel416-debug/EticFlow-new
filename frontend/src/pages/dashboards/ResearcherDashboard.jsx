/**
 * EthicFlow — Researcher Dashboard (placeholder)
 * Shows submission stats + recent submissions list.
 * Sprint 2 will add real data fetching.
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

const MOCK_SUBMISSIONS = [
  { id: 'ETH-2026-001', title: 'מחקר על תגובות חיסון — שלב ב׳',   status: 'UNDER_REVIEW',      date: '01/03/2026' },
  { id: 'ETH-2026-002', title: 'בדיקת תרופה ניסיונית — פאזה 1',    status: 'REVISION_REQUIRED', date: '15/02/2026' },
  { id: 'ETH-2026-003', title: 'סקר עמדות סטודנטים — מדיה חברתית', status: 'APPROVED',          date: '10/01/2026' },
]

const STATUS_STYLES = {
  UNDER_REVIEW:      'text-white',
  REVISION_REQUIRED: 'bg-amber-100 text-amber-800',
  APPROVED:          'bg-green-100 text-green-800',
  DRAFT:             'bg-gray-100 text-gray-700',
  REJECTED:          'bg-red-100 text-red-700',
}

/** @param {{ status: string }} props */
function StatusBadge({ status }) {
  const { t } = useTranslation()
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  const isNavy = status === 'UNDER_REVIEW'
  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${cls}`}
      style={isNavy ? { background: 'var(--lev-navy)' } : {}}
    >
      {t(`submission.status.${status}`)}
    </span>
  )
}

export default function ResearcherDashboard() {
  const { t }    = useTranslation()
  const { user } = useAuth()


  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('dashboard.researcher.greeting')}, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">{t('dashboard.researcher.title')}</p>
        </div>
        <Link
          to="/submissions/new"
          className="text-sm font-semibold text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'var(--lev-navy)', minHeight: '44px', display: 'flex', alignItems: 'center' }}
        >
          + {t('dashboard.researcher.newSubmission')}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('dashboard.researcher.activeSubmissions'), value: 3, color: 'var(--lev-navy)' },
          { label: t('dashboard.researcher.pendingRevision'),   value: 1, color: '#d97706' },
          { label: t('dashboard.researcher.approvedThisYear'),  value: 5, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-600">{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Submissions table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
            {t('dashboard.researcher.recentSubmissions')}
          </h2>
          <Link to="/submissions" className="text-xs hover:underline"
            style={{ color: 'var(--lev-teal-text)' }}>
            {t('dashboard.researcher.viewAll')}
          </Link>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm" dir="auto">
            <thead>
              <tr className="border-b border-gray-100">
                <th scope="col" className="text-start px-5 py-3 text-xs font-semibold text-gray-600">{t('submission.table.id')}</th>
                <th scope="col" className="text-start px-5 py-3 text-xs font-semibold text-gray-600">{t('submission.table.title')}</th>
                <th scope="col" className="text-start px-5 py-3 text-xs font-semibold text-gray-600">{t('submission.table.date')}</th>
                <th scope="col" className="text-start px-5 py-3 text-xs font-semibold text-gray-600">{t('submission.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_SUBMISSIONS.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-gray-600 font-mono" dir="ltr">{s.id}</td>
                  <td className="px-5 py-3.5 font-medium">{s.title}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600" dir="ltr">{s.date}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {MOCK_SUBMISSIONS.map((s) => (
            <div key={s.id} className="px-4 py-3.5 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium leading-snug">{s.title}</p>
                <p className="text-xs text-gray-600 mt-0.5" dir="ltr">{s.id} · {s.date}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
