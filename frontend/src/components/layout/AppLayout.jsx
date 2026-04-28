/**
 * EthicFlow — App Layout (brand refresh)
 * Wraps all authenticated pages. Renders Sidebar + sticky top header + <Outlet>.
 * Mobile: hamburger toggles sidebar drawer. Desktop: sidebar always visible.
 * Monochrome lucide icons replace emojis for professional look.
 */

import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Bell } from 'lucide-react'
import Sidebar from './Sidebar'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import ImpersonationBanner from './ImpersonationBanner'
import RoleSwitcher from './RoleSwitcher'
import api from '../../services/api'

/**
 * Shell layout used by all protected routes.
 */
export default function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  function handleToggleSidebar() {
    if (window.innerWidth >= 1024) return
    setSidebarOpen((prev) => !prev)
  }

  useEffect(() => {
    function closeDrawerOnDesktop() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', closeDrawerOnDesktop)
    return () => window.removeEventListener('resize', closeDrawerOnDesktop)
  }, [])

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-base)' }}>
      <ImpersonationBanner />

      <div className="flex flex-1 min-h-0">
        <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Sticky top header ── */}
          <header
            className="sticky top-0 z-20 px-4 md:px-6 py-2.5 flex items-center justify-between bg-white"
            style={{
              borderBottom: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <button
              type="button"
              onClick={handleToggleSidebar}
              aria-label={t('pages.openMenu')}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              className="lg:hidden inline-flex items-center justify-center rounded-lg transition hover:bg-gray-100"
              style={{
                minWidth: 44,
                minHeight: 44,
                color: 'var(--text-secondary)',
              }}
            >
              <Menu size={22} strokeWidth={1.75} aria-hidden="true" focusable="false" />
            </button>

            <div id="page-title" className="hidden md:block" />

            <div className="flex items-center gap-2 ms-auto">
              <RoleSwitcher />
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                aria-label={unreadCount > 0
                  ? `${t('common.notifications')} — ${unreadCount}`
                  : t('common.notifications')}
                className="relative inline-flex items-center justify-center rounded-lg transition hover:bg-gray-100"
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  color: 'var(--text-secondary)',
                }}
              >
                <Bell size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute tabular-nums font-bold text-white flex items-center justify-center"
                    style={{
                      top: 6,
                      insetInlineEnd: 6,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--lev-purple)',
                      fontSize: 10,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          <main
            id="main-content"
            tabIndex="-1"
            className="flex-1 p-4 md:p-6 overflow-auto"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
