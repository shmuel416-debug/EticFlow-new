/**
 * Ethic-Net — Role Switcher
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
  const { user, setActiveRole, isImpersonating, stopImpersonation } = useAuth()

  const roles = Array.isArray(user?.roles) ? user.roles : []
  const showRoleSelect = roles.length > 1
  const showReturnButton = isImpersonating
  if (!showRoleSelect && !showReturnButton) return null

  return (
    <div className="flex items-center gap-2">
      {showRoleSelect && (
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
      )}
      {showReturnButton && (
        <button
          type="button"
          onClick={stopImpersonation}
          className="border rounded-md px-2 py-1 text-xs font-semibold transition-colors"
          style={{
            minHeight: 32,
            borderColor: 'var(--status-warning)',
            color: 'var(--status-warning)',
            background: 'var(--status-warning-50)',
          }}
          aria-label={t('admin.stopImpersonation')}
        >
          {t('admin.stopImpersonation')}
        </button>
      )}
    </div>
  )
}
