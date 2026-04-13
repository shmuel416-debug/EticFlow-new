/**
 * EthicFlow — StatusTransitionPanel Component
 * Renders allowed next-status action buttons based on current status + user role.
 * Mirrors the server-side transition matrix — no extra API call needed.
 * IS 5568: each button has aria-describedby pointing to status description.
 */

import { useTranslation } from 'react-i18next'

/** Transition matrix matching server-side TRANSITIONS constant. */
const TRANSITIONS = {
  SUBMITTED:        { next: ['IN_TRIAGE'],                              roles: ['SECRETARY','ADMIN'] },
  IN_TRIAGE:        { next: ['ASSIGNED'],                               roles: ['SECRETARY','ADMIN'] },
  ASSIGNED:         { next: ['IN_REVIEW'],                              roles: ['SECRETARY','ADMIN'] },
  IN_REVIEW:        { next: ['APPROVED','REJECTED','PENDING_REVISION'], roles: ['CHAIRMAN','ADMIN'] },
  PENDING_REVISION: { next: ['SUBMITTED'],                              roles: ['SECRETARY','ADMIN'] },
}

/** Button color per target status. */
const STATUS_BUTTON_STYLE = {
  IN_TRIAGE:        'bg-yellow-500 hover:bg-yellow-600 text-white',
  ASSIGNED:         'bg-orange-500 hover:bg-orange-600 text-white',
  IN_REVIEW:        'bg-purple-600 hover:bg-purple-700 text-white',
  APPROVED:         'bg-green-600 hover:bg-green-700 text-white',
  REJECTED:         'bg-red-600 hover:bg-red-700 text-white',
  PENDING_REVISION: 'bg-red-400 hover:bg-red-500 text-white',
  SUBMITTED:        'bg-blue-600 hover:bg-blue-700 text-white',
}

/**
 * @param {{
 *   currentStatus: string,
 *   userRole: string,
 *   onTransition: (status: string) => Promise<void>,
 *   loading?: boolean
 * }} props
 */
export default function StatusTransitionPanel({ currentStatus, userRole, onTransition, loading = false }) {
  const { t } = useTranslation()

  const rule = TRANSITIONS[currentStatus]
  if (!rule || !rule.roles.includes(userRole)) return null

  return (
    <div className="space-y-2">
      <p id="transition-desc" className="text-sm font-medium text-gray-700">
        {t('submission.detail.changeStatus')}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="transition-desc">
        {rule.next.map((nextStatus) => (
          <button
            key={nextStatus}
            onClick={() => onTransition(nextStatus)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${STATUS_BUTTON_STYLE[nextStatus] ?? 'bg-gray-500 text-white'}`}
            style={{ minHeight: '44px' }}
            aria-describedby="transition-desc"
          >
            {t(`submission.status.${nextStatus}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
