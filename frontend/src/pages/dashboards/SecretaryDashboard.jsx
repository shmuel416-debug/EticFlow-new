/**
 * EthicFlow — Secretary Dashboard (placeholder)
 * Sprint 2 will add real data fetching.
 */

import { useTranslation } from 'react-i18next'

export default function SecretaryDashboard() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
        {t('dashboard.secretary.title')}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('dashboard.secretary.pendingReview'),      value: 7,  color: 'var(--lev-navy)' },
          { label: t('dashboard.secretary.slaWarning'),         value: 2,  color: '#d97706' },
          { label: t('dashboard.secretary.completedThisMonth'), value: 12, color: '#16a34a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-600">{label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500 text-sm">
        {t('pages.comingSoon')}
      </div>
    </div>
  )
}
