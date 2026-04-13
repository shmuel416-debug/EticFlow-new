/**
 * EthicFlow — Notifications Page
 * Displays user notifications with mark-as-read functionality.
 * IS 5568: role="list", aria-live for updates.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'

/**
 * Formats ISO date to relative or locale time.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * User notifications list with mark-read actions.
 */
export default function NotificationsPage() {
  const { t }               = useTranslation()
  const [notifications,     setNotifications]     = useState([])
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState('')
  const [markingAll,        setMarkingAll]        = useState(false)

  /**
   * Fetches notifications from API.
   */
  async function fetchNotifications() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.data ?? [])
    } catch {
      setError(t('notifications.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, []) // eslint-disable-line

  /**
   * Marks a single notification as read.
   * @param {string} notifId
   */
  async function handleMarkRead(notifId) {
    try {
      await api.patch(`/notifications/${notifId}/read`)
      setNotifications((prev) =>
        prev.map((n) => n.id === notifId ? { ...n, isRead: true } : n)
      )
    } catch { /* silent */ }
  }

  /**
   * Marks all notifications as read.
   */
  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch { /* silent */ } finally {
      setMarkingAll(false)
    }
  }

  const unread = notifications.filter((n) => !n.isRead).length

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--lev-navy)' }}>
          {t('notifications.pageTitle')}
          {unread > 0 && (
            <span className="ms-2 text-sm font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {t('notifications.unreadBadge', { count: unread })}
            </span>
          )}
        </h1>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            style={{ minHeight: '44px' }}
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

      {loading && <p className="text-center text-gray-400 py-8">{t('common.loading')}</p>}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3" aria-hidden="true">🔔</p>
          <p>{t('notifications.noItems')}</p>
        </div>
      )}

      <ul role="list" aria-live="polite" className="space-y-2">
        {notifications.map((notif) => (
          <li
            key={notif.id}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${
              notif.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}
            onClick={() => !notif.isRead && handleMarkRead(notif.id)}
            role="button"
            tabIndex={notif.isRead ? -1 : 0}
            onKeyDown={(e) => e.key === 'Enter' && !notif.isRead && handleMarkRead(notif.id)}
            aria-label={notif.isRead ? undefined : `${t(`notifications.types.${notif.type}`, notif.type)} — ${t('notifications.markAllRead')}`}
          >
            <div className="flex items-start gap-3">
              {!notif.isRead && (
                <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {t(`notifications.types.${notif.type}`, notif.type)}
                </p>
                {notif.metaJson?.applicationId && (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{notif.metaJson.applicationId}</p>
                )}
                <time className="text-xs text-gray-400 mt-1 block" dateTime={notif.createdAt}>
                  {formatDate(notif.createdAt)}
                </time>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
