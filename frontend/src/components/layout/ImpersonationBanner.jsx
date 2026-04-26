/**
 * EthicFlow — Impersonation Banner
 * Displayed at the top of the screen when an admin is impersonating another user.
 * Amber background, non-dismissable, shows impersonated user details + stop button.
 * IS 5568 / WCAG 2.2 AA: min-height 44px, role="alert", aria-live="polite".
 */

import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * Renders a sticky amber banner when impersonation is active.
 * Returns null when not impersonating.
 * @returns {JSX.Element|null}
 */
export default function ImpersonationBanner() {
  const { t }                             = useTranslation()
  const { user, isImpersonating, stopImpersonation } = useAuth()

  if (!isImpersonating) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-400 text-amber-900 flex items-center justify-between px-4 py-2 min-h-[44px] sticky top-0 z-50 border-b-2 border-amber-500"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <User size={18} strokeWidth={1.75} className="shrink-0" aria-hidden="true" focusable="false" />
        <span>
          {t('admin.impersonationBanner', {
            name: user?.fullName ?? user?.email ?? '',
            role: t(`roles.${user?.role?.toLowerCase() ?? 'unknown'}`),
          })}
        </span>
      </div>

      <button
        onClick={stopImpersonation}
        className="bg-amber-900 text-amber-50 px-3 py-2 rounded text-sm font-semibold
                   hover:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-900
                   focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] transition-colors"
        aria-label={t('admin.stopImpersonation')}
      >
        {t('admin.stopImpersonation')}
      </button>
    </div>
  )
}
