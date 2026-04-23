/**
 * EthicFlow — COI Badge
 * Displays recused attendees for an agenda item.
 */

import { useTranslation } from 'react-i18next'

/**
 * Displays recusal badge text.
 * @param {{ names: string[] }} props
 * @returns {JSX.Element|null}
 */
export default function CoiBadge({ names = [] }) {
  const { t } = useTranslation()
  if (names.length === 0) return null
  return (
    <p className="text-xs text-amber-700 mt-1">
      {t('coi.recused')}: {names.join(', ')}
    </p>
  )
}
