/**
 * EthicFlow — Reviewer Diff Page
 * Placeholder diff screen for version comparison in reviewer workflow.
 */

import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

/**
 * Reviewer diff placeholder page.
 * @returns {JSX.Element}
 */
export default function ReviewDiffPage() {
  const { t } = useTranslation()
  const { id } = useParams()

  return (
    <main id="main-content" className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-4">
        <Link
          to={`/reviewer/assignments/${id}`}
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--lev-teal-text)' }}
        >
          {t('submission.detail.backToList')}
        </Link>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-4xl mb-3" aria-hidden="true">🧾</p>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--lev-navy)' }}>
          {t('reviewer.assignments.pageTitle')}
        </h1>
        <p className="text-sm text-gray-600">{t('pages.comingSoon')}</p>
      </section>
    </main>
  )
}
