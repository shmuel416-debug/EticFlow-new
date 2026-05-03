/**
 * EthicFlow — StatusTransitionPanel Component
 * Renders allowed next-status action buttons based on current status + user role.
 * Mirrors the server-side transition matrix — no extra API call needed.
 * IS 5568: each button has aria-describedby pointing to status description.
 */

import { useTranslation } from 'react-i18next'
import useStatusConfig from '../../hooks/useStatusConfig'

/**
 * @param {{
 *   currentStatus: string,
 *   userRole: string,
 *   submissionId?: string,
 *   onTransition: (status: string) => Promise<void>,
 *   loading?: boolean
 * }} props
 */
export default function StatusTransitionPanel({
  currentStatus,
  userRole,
  submissionId = null,
  onTransition,
  loading = false,
}) {
  const { t, i18n } = useTranslation()
  const { transitionsByFromCode, statusMap } = useStatusConfig({
    submissionId,
    status: currentStatus,
  })
  const transitions = (transitionsByFromCode[currentStatus] || []).filter((transition) =>
    (transition.allowedRoles || []).includes(userRole)
  )
  if (transitions.length === 0 || !userRole) return null

  return (
    <div className="space-y-2">
      <p id="transition-desc" className="text-sm font-medium text-gray-700">
        {t('submission.detail.changeStatus')}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="transition-desc">
        {transitions.map((transition) => {
          const nextStatus = transition.toCode
          const statusConfig = statusMap[nextStatus]
          const labelFromDb = i18n.language === 'he' ? statusConfig?.labelHe : statusConfig?.labelEn
          const descriptionId = `transition-desc-${nextStatus}`
          return (
          <button
            key={nextStatus}
            data-testid={`status-transition-${nextStatus}`}
            onClick={() => onTransition(nextStatus)}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 text-white"
            style={{ minHeight: '44px', backgroundColor: statusConfig?.color || '#64748b' }}
            aria-describedby={descriptionId}
            aria-label={t('submission.detail.transitionToStatus', {
              status: t(`submission.status.${nextStatus}`, labelFromDb || nextStatus),
            })}
          >
            {t(`submission.status.${nextStatus}`, labelFromDb || nextStatus)}
          </button>
          )
        })}
      </div>
      {transitions.map((transition) => (
        <p key={`desc-${transition.toCode}`} id={`transition-desc-${transition.toCode}`} className="lev-sr-only">
          {t('submission.detail.changeStatus')}
        </p>
      ))}
    </div>
  )
}
