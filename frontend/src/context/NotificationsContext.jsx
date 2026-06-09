/* eslint-disable react-refresh/only-export-components */
/**
 * Ethic-Net — Notifications Context
 * Shared unread notification count for header bell and sidebar nav badge.
 * Polls API every 60s and refetches when the tab becomes visible.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const POLL_INTERVAL_MS = 60000

/** @type {React.Context} */
const NotificationsContext = createContext(null)

/**
 * Provides unread notification count and update helpers to layout children.
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0)

  /**
   * Fetches current unread count from the API.
   * @returns {Promise<void>}
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=1&unreadOnly=true')
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  /**
   * Optimistically decrements unread count after marking one notification read.
   */
  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  /**
   * Clears unread count after marking all notifications read.
   */
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      if (!active) return
      await refreshUnreadCount()
    }

    load()
    const interval = window.setInterval(load, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        load()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshUnreadCount])

  return (
    <NotificationsContext.Provider value={{
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      clearUnreadCount,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

/**
 * Hook to access notifications context.
 * @returns {{ unreadCount: number, refreshUnreadCount: Function,
 *   decrementUnreadCount: Function, clearUnreadCount: Function }}
 */
export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
