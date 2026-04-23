/**
 * EthicFlow — Continuing Review Service
 * Sends annual continuing-review reminders for approved submissions.
 */

import prisma from '../config/database.js'
import { notifyUser } from './notification.service.js'

/**
 * Returns continuing-review reminder lead days from institution settings.
 * @returns {Promise<number>}
 */
async function getReminderLeadDays() {
  const row = await prisma.institutionSetting.findUnique({
    where: { key: 'continuing_review_reminder_days' },
  })
  const parsed = parseInt(row?.value ?? '30', 10)
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 30
}

/**
 * Runs continuing-review reminder checks.
 * @returns {Promise<{ reminders: number }>}
 */
export async function runContinuingReviewCheck() {
  const reminderDays = await getReminderLeadDays()
  const now = new Date()
  const dueThreshold = new Date(now)
  dueThreshold.setDate(dueThreshold.getDate() + reminderDays)

  const approved = await prisma.submission.findMany({
    where: { isActive: true, status: 'APPROVED' },
    include: { author: true },
  })

  let reminders = 0
  for (const submission of approved) {
    const reviewDue = new Date(submission.updatedAt)
    reviewDue.setFullYear(reviewDue.getFullYear() + 1)
    if (reviewDue > dueThreshold) continue

    const existing = await prisma.notification.findFirst({
      where: {
        userId: submission.authorId,
        type: 'SYSTEM',
        titleKey: 'notifications.continuingReview.title',
        metaJson: {
          path: ['submissionId'],
          equals: submission.id,
        },
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    })
    if (existing) continue

    await notifyUser(
      submission.authorId,
      'SYSTEM',
      'notifications.continuingReview.title',
      'notifications.continuingReview.body',
      {
        submissionId: submission.id,
        applicationId: submission.applicationId,
        dueDate: reviewDue.toISOString(),
      },
      {
        to: submission.author?.email,
        subject: `Continuing review reminder: ${submission.applicationId}`,
        body: `Your approved study ${submission.applicationId} requires an annual continuing review by ${reviewDue.toISOString().slice(0, 10)}.`,
      }
    )
    reminders++
  }

  console.log(`[ContinuingReview] reminders sent: ${reminders}`)
  return { reminders }
}
