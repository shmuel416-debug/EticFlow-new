/**
 * EthicFlow — Sidebar Navigation
 * Desktop: fixed side panel. Mobile: slide-in drawer via isOpen prop.
 * Nav items filtered by user role.
 * IS 5568: nav landmark, aria-current, min 44px targets, aria-hidden on icons.
 */

import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import levLogo from '../../assets/LOGO.jpg'

/** Navigation items — visible roles control who sees each link */
const NAV_ITEMS = [
  { key: 'dashboard',            icon: '🏠', path: '/dashboard',              roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'mySubmissions',        icon: '📄', path: '/submissions',            roles: ['RESEARCHER'] },
  { key: 'newSubmission',        icon: '📬', path: '/submissions/new',        roles: ['RESEARCHER'] },
  { key: 'allSubmissions',       icon: '📋', path: '/submissions',            roles: ['REVIEWER'] },
  { key: 'secretarySubmissions', icon: '📋', path: '/secretary/submissions',  roles: ['SECRETARY','ADMIN'] },
  { key: 'myAssignments',        icon: '🔍', path: '/reviewer/assignments',   roles: ['REVIEWER'] },
  { key: 'chairmanQueue',        icon: '⚖️', path: '/chairman/queue',         roles: ['CHAIRMAN','ADMIN'] },
  { key: 'formLibrary',          icon: '📂', path: '/secretary/forms',        roles: ['SECRETARY','ADMIN'] },
  { key: 'meetings',             icon: '📅', path: '/meetings',               roles: ['SECRETARY','CHAIRMAN','ADMIN'] },
  { key: 'protocols',            icon: '📋', path: '/protocols',              roles: ['SECRETARY','CHAIRMAN','ADMIN'] },
  { key: 'notifications',        icon: '🔔', path: '/notifications',          roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'users',                icon: '👥', path: '/users',                  roles: ['ADMIN'] },
  { key: 'reports',              icon: '📊', path: '/reports',                roles: ['CHAIRMAN','ADMIN'] },
  { key: 'auditLog',            icon: '🔍', path: '/reports/audit-log',       roles: ['ADMIN'], indent: true },
  { key: 'settings',             icon: '⚙️', path: '/settings',              roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
]

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const { user, logout, isImpersonating, impersonation } = useAuth()
  const navigate = useNavigate()
  const isRtl = i18n.dir() === 'rtl'

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  /** Split into main items and settings (last item) */
  const mainItems     = visibleItems.filter((i) => i.key !== 'settings')
  const settingsItem  = visibleItems.find((i)  => i.key === 'settings')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  /**
   * Close drawer from any user interaction surface (button/overlay).
   * Handles mobile touch environments where click can be unreliable.
   * @param {import('react').SyntheticEvent} [event]
   * @returns {void}
   */
  function handleCloseDrawer(event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    onClose()
  }

  const initials = user?.fullName?.charAt(0) ?? '?'

  useEffect(() => {
    if (!isOpen) return undefined

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => window.removeEventListener('keydown', handleEscapeKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onPointerDown={handleCloseDrawer}
          onClick={handleCloseDrawer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 bottom-0 z-40 flex flex-col bg-white border-gray-100
          transition-transform duration-200
          md:static md:translate-x-0 md:border-s
          ${isOpen
            ? 'translate-x-0'
            : isRtl
              ? '-translate-x-full md:translate-x-0'
              : 'translate-x-full md:translate-x-0'}
        `}
        style={isRtl ? { width: '220px', left: 0 } : { width: '220px', right: 0 }}
        aria-label={t('nav.mainNavigation')}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <img src={levLogo} alt={t('common.institution')} className="h-7 w-auto" />
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--lev-navy)' }}>EthicFlow</p>
            <p className="text-xs text-gray-600">{t('common.institution')}</p>
          </div>
          {/* Mobile close button */}
          <button
            type="button"
            onPointerDown={handleCloseDrawer}
            onClick={handleCloseDrawer}
            className="md:hidden ms-auto text-gray-500 hover:text-gray-800"
            aria-label={t('pages.closeMenu')}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label={t('nav.mainNavigation')}>
          {mainItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: item.indent ? '8px 14px 8px 32px' : '10px 14px',
                borderRadius: '8px',
                fontSize: item.indent ? '13px' : '14px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? 'var(--lev-navy)' : item.indent ? '#6b7280' : '#374151',
                background: isActive ? '#cceef5' : 'transparent',
                textDecoration: 'none',
                minHeight: '44px',
                transition: 'background 0.15s',
              })}
              aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}

          {settingsItem && (
            <div className="pt-3 mt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 px-3 mb-1">{t('nav.system')}</p>
              <NavLink
                to={settingsItem.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '8px',
                  fontSize: '14px', fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--lev-navy)' : '#374151',
                  background: isActive ? '#cceef5' : 'transparent',
                  textDecoration: 'none', minHeight: '44px', transition: 'background 0.15s',
                })}
              >
                <span aria-hidden="true">⚙️</span>
                <span>{t('nav.settings')}</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-100">
          {/* Impersonation indicator */}
          {isImpersonating && impersonation?.originalUser && (
            <div className="mb-2 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-1.5">
              <span aria-hidden="true">👤</span>
              <span>{t('admin.impersonatingAs', { name: impersonation.originalUser.fullName })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: isImpersonating ? '#d97706' : 'var(--lev-navy)' }}
              aria-hidden="true">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: isImpersonating ? '#92400e' : 'var(--lev-navy)' }}>
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-600">{t(`roles.${user?.role}`)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-600 hover:text-red-600 transition-colors flex-shrink-0"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label={t('common.logout')}
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
