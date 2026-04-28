/**
 * EthicFlow — Sidebar Navigation (brand refresh)
 * Desktop: fixed 240px side panel. Mobile: slide-in drawer controlled by isOpen.
 * Nav items filtered by user role. Monochrome lucide icons (no emojis).
 * Brand identity: navy header, gold-accent on active pill, subtle gradient strip.
 * IS 5568: nav landmark, aria-current="page", 44px min targets, aria-hidden icons.
 */

import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import levLogo from '../../assets/LOGO.jpg'
import {
  Home, FileText, FilePlus2, ClipboardList, Search, Scale, FolderOpen,
  Calendar, CalendarDays, Bell, Shield, AlertTriangle, Users, BarChart3,
  Compass, Settings, LogOut, X, UserCircle2, Accessibility, ListChecks,
} from 'lucide-react'

/** Navigation items (monochrome lucide icons, role-gated) */
const NAV_ITEMS = [
  { key: 'dashboard',            icon: Home,          path: '/dashboard',              roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'mySubmissions',        icon: FileText,      path: '/submissions',            roles: ['RESEARCHER'] },
  { key: 'newSubmission',        icon: FilePlus2,     path: '/submissions/new',        roles: ['RESEARCHER'] },
  { key: 'allSubmissions',       icon: ClipboardList, path: '/submissions',            roles: ['REVIEWER'] },
  { key: 'secretarySubmissions', icon: ClipboardList, path: '/secretary/submissions',  roles: ['SECRETARY','ADMIN'] },
  { key: 'myAssignments',        icon: Search,        path: '/reviewer/assignments',   roles: ['REVIEWER','CHAIRMAN'] },
  { key: 'chairmanQueue',        icon: Scale,         path: '/chairman/queue',         roles: ['CHAIRMAN','ADMIN'] },
  { key: 'formLibrary',          icon: FolderOpen,    path: '/secretary/forms',        roles: ['SECRETARY','ADMIN'] },
  { key: 'meetings',             icon: Calendar,      path: '/meetings',               roles: ['SECRETARY','CHAIRMAN','ADMIN'] },
  { key: 'meetingsCalendar',     icon: CalendarDays,  path: '/meetings/calendar',      roles: ['SECRETARY','CHAIRMAN','ADMIN'], indent: true },
  { key: 'protocols',            icon: ClipboardList, path: '/protocols',              roles: ['SECRETARY','CHAIRMAN','ADMIN'] },
  { key: 'notifications',        icon: Bell,          path: '/notifications',          roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'privacy',              icon: Shield,        path: '/privacy',                roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'accessibilityStatement', icon: Accessibility, path: '/accessibility-statement', roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'coi',                  icon: AlertTriangle, path: '/profile/coi',            roles: ['RESEARCHER','SECRETARY','REVIEWER','CHAIRMAN','ADMIN'] },
  { key: 'users',                icon: Users,         path: '/users',                  roles: ['ADMIN'] },
  { key: 'reports',              icon: BarChart3,     path: '/reports',                roles: ['SECRETARY','CHAIRMAN','ADMIN'] },
  { key: 'auditLog',             icon: Search,        path: '/reports/audit-log',      roles: ['ADMIN'], indent: true },
  { key: 'statusManagement',     icon: Compass,       path: '/admin/statuses',         roles: ['ADMIN'], indent: true },
  { key: 'systemTemplates',      icon: FileText,      path: '/admin/system-templates', roles: ['ADMIN'], indent: true },
  { key: 'checklistTemplates',   icon: ListChecks,    path: '/admin/checklist-templates', roles: ['ADMIN'], indent: true },
  { key: 'settings',             icon: Settings,      path: '/settings',               roles: ['SECRETARY','CHAIRMAN','REVIEWER','ADMIN'] },
]

const SIDEBAR_WIDTH = 240

/**
 * Nav item renderer — consistent styling, gold accent when active.
 * @param {{ item: typeof NAV_ITEMS[number], onNavigate: () => void }} props
 */
function NavItem({ item, onNavigate }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      onClick={onNavigate}
      className={({ isActive }) => [
        'group flex items-center gap-3 rounded-xl font-medium relative',
        'transition-colors outline-none',
        isActive ? 'nav-item-active' : 'hover:bg-gray-50',
      ].join(' ')}
      style={({ isActive }) => ({
        padding: item.indent ? '8px 14px 8px 32px' : '10px 14px',
        fontSize: item.indent ? '13px' : '14px',
        minHeight: 44,
        color: isActive ? 'var(--lev-navy)' : 'var(--text-secondary)',
        background: isActive ? 'var(--lev-navy-50)' : undefined,
        fontWeight: isActive ? 700 : 500,
        textDecoration: 'none',
      })}
      aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetInlineStart: 0,
                top: 8, bottom: 8,
                width: 3,
                borderRadius: 3,
                background: 'var(--lev-gold)',
              }}
            />
          )}
          <Icon
            size={18}
            strokeWidth={isActive ? 2 : 1.75}
            aria-hidden="true"
            focusable="false"
            style={{ flexShrink: 0, color: 'inherit' }}
          />
          <span className="truncate">{t(`nav.${item.key}`)}</span>
        </>
      )}
    </NavLink>
  )
}

/**
 * @param {{ isOpen: boolean, onClose: () => void }} props
 */
export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const { user, logout, isImpersonating, impersonation } = useAuth()
  const navigate = useNavigate()
  const isRtl = i18n.dir() === 'rtl'
  const activeRole = user?.activeRole || user?.role

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(activeRole)
  )
  const mainItems    = visibleItems.filter((i) => i.key !== 'settings')
  const settingsItem = visibleItems.find((i) => i.key === 'settings')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleCloseDrawer(event) {
    if (event) { event.preventDefault(); event.stopPropagation() }
    onClose()
  }

  const initials = user?.fullName?.charAt(0) ?? '?'

  useEffect(() => {
    if (!isOpen) return undefined
    function handleEscapeKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEscapeKey)
    return () => window.removeEventListener('keydown', handleEscapeKey)
  }, [isOpen, onClose])

  const sidebarStyle = isRtl
    ? { width: SIDEBAR_WIDTH, right: 0 }
    : { width: SIDEBAR_WIDTH, left: 0 }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'var(--surface-overlay)' }}
          onPointerDown={handleCloseDrawer}
          onClick={handleCloseDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        className={`
          fixed top-0 bottom-0 z-40 flex flex-col bg-white
          transition-transform duration-200 ease-out
          md:static md:translate-x-0
          ${isOpen
            ? 'translate-x-0'
            : isRtl
              ? 'translate-x-full md:translate-x-0'
              : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          ...sidebarStyle,
          borderInlineEnd: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
        aria-label={t('nav.mainNavigation')}
      >
        {/* ── Brand header ── */}
        <div
          className="relative px-4 py-4 text-white"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-1.5 flex-shrink-0 shadow-sm">
              <img src={levLogo} alt="" aria-hidden="true" className="h-8 w-auto" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">EthicFlow</p>
              <p className="text-[11px] opacity-85 leading-tight truncate">
                {t('common.institution')}
              </p>
            </div>
            <button
              type="button"
              onPointerDown={handleCloseDrawer}
              onClick={handleCloseDrawer}
              className="md:hidden ms-auto text-white/90 hover:text-white inline-flex items-center justify-center rounded-lg"
              aria-label={t('pages.closeMenu')}
              style={{ minWidth: 40, minHeight: 40 }}
            >
              <X size={20} strokeWidth={2} aria-hidden="true" focusable="false" />
            </button>
          </div>
          <div
            className="absolute bottom-0 inset-x-0"
            style={{ height: 2, background: 'var(--lev-gold)' }}
            aria-hidden="true"
          />
        </div>

        {/* ── Nav items ── */}
        <nav
          className="flex-1 p-3 space-y-0.5 overflow-y-auto"
          aria-label={t('nav.mainNavigation')}
        >
          {mainItems.map((item) => (
            <NavItem key={item.key} item={item} onNavigate={onClose} />
          ))}

          {settingsItem && (
            <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p
                className="text-[11px] px-3 mb-1 font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('nav.system')}
              </p>
              <NavItem item={settingsItem} onNavigate={onClose} />
            </div>
          )}
        </nav>

        {/* ── User footer ── */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {isImpersonating && impersonation?.originalUser && (
            <div
              className="mb-2 px-2.5 py-2 rounded-xl flex items-center gap-2 text-xs"
              style={{
                background: 'var(--status-warning-50)',
                color: 'var(--status-warning)',
                border: '1px solid var(--status-warning)',
              }}
            >
              <UserCircle2 size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="truncate">
                {t('admin.impersonatingAs', { name: impersonation.originalUser.fullName })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5 p-2 rounded-xl">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{
                background: isImpersonating ? 'var(--status-warning)' : 'var(--gradient-brand)',
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-bold truncate"
                style={{ color: isImpersonating ? 'var(--status-warning)' : 'var(--lev-navy)' }}
              >
                {user?.fullName}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {t(`roles.${activeRole?.toLowerCase() ?? 'unknown'}`)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg transition hover:bg-red-50 flex-shrink-0"
              style={{
                minWidth: 40,
                minHeight: 40,
                color: 'var(--text-secondary)',
              }}
              aria-label={t('common.logout')}
            >
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
