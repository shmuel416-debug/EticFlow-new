/**
 * EthicFlow — Notifications Page
 * Displays user notifications with mark-as-read functionality.
 * Refreshed to Lev design system (PageHeader + Card primitives + Badge).
 * IS 5568: role="list", aria-live for updates.
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Check, AlertCircle } from 'lucide-react'
import api from '../services/api'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Badge,
  Spinner,
  EmptyState,
  IconButton,
} from '../components/ui'

/**
 * Formats ISO date to relative or locale time.
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  return new Date(iso).toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

/**
 * User notifications list with mark-read actions.
 * @returns {JSX.Element}
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
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
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

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {unread > 0 && (
        <Badge tone="info" size="md">
          {t('notifications.unreadBadge', { count: unread })}
        </Badge>
      )}
      {unread > 0 && (
        <Button
          variant="secondary"
          onClick={handleMarkAllRead}
          disabled={markingAll}
          loading={markingAll}
          leftIcon={
            <Check
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              focusable="false"
            />
          }
        >
          {t('notifications.markAllRead')}
        </Button>
      )}
    </div>
  )

  return (
    <main id="main-content" className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <PageHeader
        title={t('notifications.pageTitle')}
        backTo="/dashboard"
        backLabel={t('common.backToDashboard', t('statusPage.backToDashboard'))}
        actions={headerActions}
      />

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{
            background: 'var(--status-danger-50)',
            color: 'var(--status-danger)',
            border: '1px solid var(--status-danger)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 14px',
          }}
        >
          <AlertCircle
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            focusable="false"
          />
          {error}
        </div>
      )}

      {loading && (
        <div
          className="flex items-center justify-center gap-3 py-8"
          role="status"
          aria-live="polite"
        >
          <Spinner size={20} label={t('common.loading')} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('common.loading')}
          </p>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              icon={Bell}
              title={t('notifications.noItems')}
            />
          </CardBody>
        </Card>
      )}

      {!loading && notifications.length > 0 && (
        <ul
          role="list"
          aria-live="polite"
          aria-label={t('notifications.pageTitle')}
          className="space-y-2"
        >
          {notifications.map((notif) => {
            const isRead = notif.isRead
            return (
              <li
                key={notif.id}
                className="transition-colors"
                style={{
                  background: isRead
                    ? 'var(--surface-raised)'
                    : 'var(--lev-navy-50)',
                  border: `1px solid ${
                    isRead ? 'var(--border-default)' : 'var(--lev-navy)'
                  }`,
                  borderRadius: 'var(--radius-xl)',
                  padding: 16,
                }}
              >
                <div
                  role="button"
                  tabIndex={isRead ? -1 : 0}
                  onClick={() => !isRead && handleMarkRead(notif.id)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && !isRead && handleMarkRead(notif.id)
                  }
                  aria-label={
                    isRead
                      ? undefined
                      : `${t(`notifications.types.${notif.type}`, notif.type)} — ${t('notifications.markAllRead')}`
                  }
                  className="flex items-start gap-3 w-full"
                  style={{ cursor: isRead ? 'default' : 'pointer' }}
                >
                  <div
                    className="inline-flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: isRead
                        ? 'var(--surface-sunken)'
                        : 'var(--lev-navy)',
                      color: isRead ? 'var(--text-muted)' : '#fff',
                    }}
                    aria-hidden="true"
                  >
                    <Bell size={18} strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t(`notifications.types.${notif.type}`, notif.type)}
                    </p>
                    {notif.metaJson?.applicationId && (
                      <p
                        className="text-xs mt-0.5 font-mono"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {notif.metaJson.applicationId}
                      </p>
                    )}
                    <time
                      className="text-xs mt-1 block"
                      style={{ color: 'var(--text-muted)' }}
                      dateTime={notif.createdAt}
                    >
                      {formatDate(notif.createdAt)}
                    </time>
                  </div>

                  {!isRead && (
                    <IconButton
                      icon={Check}
                      label={t('notifications.markAllRead')}
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkRead(notif.id)
                      }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
