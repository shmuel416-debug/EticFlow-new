/**
 * EthicFlow — App Layout
 * Wraps all authenticated pages. Renders Sidebar + top header + <Outlet>.
 * Mobile: hamburger toggles sidebar drawer. Desktop: always visible.
 */

import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import ImpersonationBanner from './ImpersonationBanner'
import api from '../../services/api'
import RoleSwitcher from './RoleSwitcher'

/**
 * Shell layout used by all protected routes.
 */
export default function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  /**
   * Toggle mobile drawer state from header button.
   */
  function handleToggleSidebar() {
    setSidebarOpen((prev) => !prev)
  }

  useEffect(() => {
    let active = true
    async function loadUnreadCount() {
      try {
        const { data } = await api.get('/notifications?limit=1&unreadOnly=true')
        if (active) setUnreadCount(data.unreadCount ?? 0)
      } catch {
        if (active) setUnreadCount(0)
      }
    }
    loadUnreadCount()
    const interval = window.setInterval(loadUnreadCount, 60000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Impersonation banner — shown above everything when admin is impersonating */}
      <ImpersonationBanner />

      <div className="flex flex-1 min-h-0">

      {/* IS 5568 — skip navigation to main content */}
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top header */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3
          flex items-center justify-between sticky top-0 z-20 shadow-sm">

          {/* Mobile: hamburger */}
          <button
            className="md:hidden text-gray-700 hover:text-gray-900"
            type="button"
            onClick={handleToggleSidebar}
            aria-label={t('pages.openMenu')}
            aria-expanded={sidebarOpen}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <span aria-hidden="true" className="text-xl">☰</span>
          </button>

          {/* Desktop: page title placeholder — filled by each page */}
          <div id="page-title" className="hidden md:block" />

          {/* Right side actions */}
          <div className="flex items-center gap-3 ms-auto">
            <RoleSwitcher />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={unreadCount > 0
                ? `${t('common.notifications')} — ${unreadCount}`
                : t('common.notifications')}
              style={{ minWidth: '44px', minHeight: '44px', position: 'relative' }}
              className="flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              <span aria-hidden="true" className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 end-1.5 min-w-4 h-4 px-1 rounded-full text-white text-xs
                    flex items-center justify-center font-bold"
                  style={{ background: 'var(--lev-purple)', fontSize: '10px' }}
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex="-1" className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>

      </div>

      </div>{/* end flex row */}
    </div>
  )
}
