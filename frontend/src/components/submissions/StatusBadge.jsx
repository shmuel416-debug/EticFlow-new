/**
 * Ethic-Net — StatusBadge Component
 * Renders a colored badge for any SubStatus enum value.
 * Used across all submission list and detail pages.
 */

import { useTranslation } from 'react-i18next'
import useStatusConfig from '../../hooks/useStatusConfig'
import { getDisplayStatusCode } from '../../utils/submissionStatusDisplay'

/**
 * Displays a submission status as a styled pill badge.
 * @param {{ status: string, className?: string, audience?: 'researcher'|'staff' }} props
 */
export default function StatusBadge({ status, className = '', audience = 'staff' }) {
  const { t, i18n } = useTranslation()
  const { statusMap } = useStatusConfig()
  const displayStatus = getDisplayStatusCode(status, audience)
  const statusConfig = statusMap[displayStatus] || statusMap[status]
  const backgroundColor = statusConfig?.color || '#64748b'
  const labelFromDb = i18n.language === 'he' ? statusConfig?.labelHe : statusConfig?.labelEn
  const label = t(`submission.status.${displayStatus}`, {
    defaultValue: t(`submission.status.${status}`, labelFromDb || status),
  })

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${className}`}
      style={{ backgroundColor }}
      aria-label={label}
    >
      {label}
    </span>
  )
}
