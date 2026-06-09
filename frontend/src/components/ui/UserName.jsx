/**
 * Ethic-Net — UserName component
 * Renders a user's locale-appropriate display name.
 */

import { useTranslation } from 'react-i18next'
import { getUserDisplayName } from '../../utils/userDisplayName'

/**
 * Displays a user's name according to the current UI language.
 * @param {{ user?: { fullName?: string|null, fullNameHe?: string|null }|null, className?: string, as?: keyof JSX.IntrinsicElements }} props
 * @returns {JSX.Element|null}
 */
export default function UserName({ user, className, as: Tag = 'span' }) {
  const { i18n } = useTranslation()
  const name = getUserDisplayName(user, i18n.language)
  if (!name) return null
  return <Tag className={className}>{name}</Tag>
}
