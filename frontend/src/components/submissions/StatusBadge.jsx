/**
 * EthicFlow — StatusBadge Component
 * Renders a colored badge for any SubStatus enum value.
 * Used across all submission list and detail pages.
 */

import { useTranslation } from 'react-i18next'

/** Color mapping per status — text + background, never color alone (IS 5568). */
const STATUS_COLORS = {
  DRAFT:            'bg-gray-100 text-gray-700',
  SUBMITTED:        'bg-blue-100 text-blue-700',
  IN_TRIAGE:        'bg-yellow-100 text-yellow-800',
  ASSIGNED:         'bg-orange-100 text-orange-700',
  IN_REVIEW:        'bg-purple-100 text-purple-700',
  PENDING_REVISION: 'bg-red-100 text-red-700',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-200 text-red-800',
  WITHDRAWN:        'bg-gray-200 text-gray-600',
  CONTINUED:        'bg-teal-100 text-teal-700',
}

/**
 * Displays a submission status as a styled pill badge.
 * @param {{ status: string, className?: string }} props
 */
export default function StatusBadge({ status, className = '' }) {
  const { t } = useTranslation()
  const color  = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  const label  = t(`submission.status.${status}`, status)

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}
      aria-label={label}
    >
      {label}
    </span>
  )
}
