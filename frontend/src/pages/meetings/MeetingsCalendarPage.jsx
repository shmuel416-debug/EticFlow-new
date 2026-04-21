/**
 * EthicFlow — Meetings Calendar Page
 * Placeholder calendar view to close screen coverage gap until full calendar grid ships.
 */

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Calendar placeholder page.
 * @returns {JSX.Element}
 */
export default function MeetingsCalendarPage() {
  const { t } = useTranslation()

  return (
    <main id="main-content" className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('meetings.title')}
        </h1>
        <Link
          to="/meetings"
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--lev-teal-text)' }}
        >
          {t('meetings.title')}
        </Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">🗓️</p>
        <p className="text-sm text-gray-600">{t('pages.comingSoon')}</p>
      </section>
    </main>
  )
}
