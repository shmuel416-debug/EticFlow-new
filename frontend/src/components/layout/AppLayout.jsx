/**
 * EthicFlow — App Layout
 * Wraps all authenticated pages. Renders Sidebar + top header + <Outlet>.
 * Mobile: hamburger toggles sidebar drawer. Desktop: always visible.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import LanguageSwitcher from '../ui/LanguageSwitcher'

/**
 * Shell layout used by all protected routes.
 */
export default function AppLayout() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-gray-50">

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
            onClick={() => setSidebarOpen(true)}
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
            <LanguageSwitcher />
            <button
              aria-label={`${t('common.notifications')} — 3`}
              style={{ minWidth: '44px', minHeight: '44px', position: 'relative' }}
              className="flex items-center justify-center text-gray-600 hover:text-gray-900"
            >
              <span aria-hidden="true" className="text-xl">🔔</span>
              <span
                className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full text-white text-xs
                  flex items-center justify-center font-bold"
                style={{ background: 'var(--lev-purple)', fontSize: '10px' }}
                aria-hidden="true"
              >
                3
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex="-1" className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
