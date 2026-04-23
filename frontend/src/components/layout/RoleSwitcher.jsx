/**
 * EthicFlow — Role Switcher
 * Allows multi-role users to select their active role.
 */

import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * Active role switcher displayed in authenticated layouts.
 * @returns {JSX.Element|null}
 */
export default function RoleSwitcher() {
  const { t } = useTranslation()
  const { user, setActiveRole } = useAuth()

  const roles = Array.isArray(user?.roles) ? user.roles : []
  if (roles.length <= 1) return null

  return (
    <label className="flex items-center gap-2 text-xs text-gray-600">
      <span>{t('roles.actingAs')}</span>
      <select
        value={user.activeRole}
        onChange={(event) => setActiveRole(event.target.value)}
        className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white min-h-[32px]"
        aria-label={t('roles.switchActive')}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {t(`roles.${role.toLowerCase()}`, role)}
          </option>
        ))}
      </select>
    </label>
  )
}
