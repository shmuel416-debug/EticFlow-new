/**
 * EthicFlow — Notifications Controller
 * Handles in-app notification retrieval and read-state management.
 * All notifications are scoped to the authenticated user.
 */

import prisma from '../config/database.js'
import { AppError } from '../utils/errors.js'

/**
 * GET /api/notifications
 * Returns paginated notifications for the authenticated user.
 * @param {import('express').Request} req - query: { page?, limit?, unreadOnly? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function list(req, res, next) {
  try {
    const page       = Math.max(1, parseInt(req.query.page  ?? '1',  10))
    const limit      = Math.min(50, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
    const skip       = (page - 1) * limit
    const unreadOnly = req.query.unreadOnly === 'true'

    const where = {
      userId:  req.user.id,
      isActive: true,
      ...(unreadOnly ? { isRead: false } : {}),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false, isActive: true } }),
    ])

    res.json({ data: notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, unreadCount })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read. Must belong to the authenticated user.
 * @param {import('express').Request} req - params: { id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function markRead(req, res, next) {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (!notification) return next(AppError.notFound('Notification'))

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data:  { isRead: true, readAt: new Date() },
    })

    res.json({ notification: updated })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the user as read.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    })

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
