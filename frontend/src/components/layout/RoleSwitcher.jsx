/**
 * Ethic-Net — Role Switcher
 * Allows multi-role users to select their active role.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'

/**
 * Active role switcher displayed in authenticated layouts.
 * @returns {JSX.Element|null}
 */
export default function RoleSwitcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, setActiveRole, isImpersonating, stopImpersonation } = useAuth()
  const [toast, setToast] = useState('')

  useEffect(() => {
    let timer = null

    /**
     * Shows a short confirmation when the active role changes.
     * @param {CustomEvent<{ role: string, auto?: boolean }>} event
     */
    function onRoleSwitched(event) {
      const role = event.detail?.role
      if (!role) return
      const label = t(`roles.${role.toLowerCase()}`, role)
      const message = event.detail?.auto
        ? t('roles.autoSwitchedTo', { role: label })
        : t('roles.switchedTo', { role: label })
      setToast(message)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setToast(''), 3000)
    }

    window.addEventListener('ef:role-switched', onRoleSwitched)
    return () => {
      window.removeEventListener('ef:role-switched', onRoleSwitched)
      if (timer) clearTimeout(timer)
    }
  }, [t])

  const roles = Array.isArray(user?.roles) ? user.roles : []
  const showRoleSelect = roles.length > 1
  const showReturnButton = isImpersonating
  if (!showRoleSelect && !showReturnButton) return null

  /**
   * Switches active role and notifies listeners.
   * @param {string} role
   */
  async function handleRoleChange(role) {
    const ok = await setActiveRole(role)
    if (!ok) {
      setToast(t('errors.UNAUTHORIZED'))
      return
    }
    window.dispatchEvent(new CustomEvent('ef:role-switched', { detail: { role, auto: false } }))
    navigate('/dashboard')
  }

  return (
    <div className="flex items-center gap-2">
      {showRoleSelect && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <span>{t('roles.actingAs')}</span>
          <select
            value={user.activeRole}
            onChange={(event) => handleRoleChange(event.target.value)}
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
      {toast ? (
        <span
          role="status"
          aria-live="polite"
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{
            background: 'var(--lev-navy-50)',
            color: 'var(--lev-navy)',
          }}
        >
          {toast}
        </span>
      ) : null}
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
