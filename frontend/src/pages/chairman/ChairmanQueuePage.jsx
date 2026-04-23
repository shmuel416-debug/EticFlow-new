/**
 * EthicFlow — Chairman Queue Page
 * Lists submissions in IN_REVIEW status awaiting final decision.
 * IS 5568: table scope, caption, min touch targets.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import api from '../../services/api'
import StatusBadge from '../../components/submissions/StatusBadge'

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
 * Chairman's queue of submissions pending final decision.
 */
export default function ChairmanQueuePage() {
  const { t }           = useTranslation()
  const location        = useLocation()
  const [submissions,   setSubmissions]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const returnPath      = `${location.pathname}${location.search}`

  useEffect(() => {
    /** Fetches IN_REVIEW submissions for the chairman. */
    async function fetchQueue() {
      try {
        const { data } = await api.get('/submissions?status=IN_REVIEW')
        setSubmissions(data.data)
      } catch {
        setError(t('chairman.queue.loadError'))
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [t])

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--lev-navy)' }}>
        {t('chairman.queue.pageTitle')}
      </h1>

      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm" aria-label={t('chairman.queue.pageTitle')}>
          <caption className="sr-only">{t('chairman.queue.pageTitle')}</caption>
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colId')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colTitle')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colAuthor')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colStatus')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colReviewer')}</th>
              <th scope="col" className="px-4 py-3 text-start">{t('submission.list.colDate')}</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">{t('submission.list.viewDetail')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
            )}
            {!loading && submissions.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{t('chairman.queue.noItems')}</td></tr>
            )}
            {!loading && submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{sub.applicationId}</td>
                <td className="px-4 py-3 font-medium">{sub.title}</td>
                <td className="px-4 py-3 text-gray-600">{sub.author?.fullName ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                <td className="px-4 py-3 text-gray-500">{sub.reviewer?.fullName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(sub.submittedAt)}</td>
                <td className="px-4 py-3">
                  <Link to={`/chairman/queue/${sub.id}`}
                    state={{ from: returnPath }}
                    data-testid={`chairman-open-submission-${sub.id}`}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--lev-navy)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                    {t('submission.list.viewDetail')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
