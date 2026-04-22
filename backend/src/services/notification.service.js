/**
 * EthicFlow — Notification Service
 * Creates in-app Notification records and sends email notifications.
 * All status-change controllers call notifyUser() as a fire-and-forget side effect.
 */

import prisma from '../config/database.js'
import { sendEmail } from './email/email.service.js'
import { getNotificationType } from './status.service.js'

/**
 * Creates a Notification record and sends an email to the recipient.
 * Fire-and-forget: caller does not need to await.
 * @param {string} userId    - Recipient user ID
 * @param {string} type      - NotificationType enum value
 * @param {string} titleKey  - i18n key for notification title
 * @param {string} bodyKey   - i18n key for notification body
 * @param {object} metaJson  - Interpolation values for i18n
 * @param {object} emailOpts - { to: string, subject: string, body: string }
 * @returns {Promise<void>}
 */
export async function notifyUser(userId, type, titleKey, bodyKey, metaJson = {}, emailOpts = null) {
  try {
    await prisma.notification.create({
      data: { userId, type, titleKey, bodyKey, metaJson },
    })

    if (emailOpts?.to) {
      await sendEmail({
        to:      emailOpts.to,
        subject: emailOpts.subject ?? titleKey,
        html:    `<p>${emailOpts.body ?? bodyKey}</p>`,
      })
    }
  } catch (err) {
    console.error('[Notification] Failed to send notification:', err.message)
  }
}

/**
 * Notifies relevant parties after a status change.
 * Resolves which users to notify based on the new status.
 * @param {object} submission - Full submission with author + reviewer
 * @param {string} newStatus  - The new SubStatus value
 * @returns {Promise<void>}
 */
export async function notifyStatusChange(submission, newStatus) {
  const type = await getNotificationType(newStatus)
  if (!type) return

  const meta = { applicationId: submission.applicationId, title: submission.title }

  if (newStatus === 'ASSIGNED' && submission.reviewerId) {
    await notifyUser(
      submission.reviewerId, type,
      'notifications.types.SUBMISSION_ASSIGNED',
      'notifications.types.SUBMISSION_ASSIGNED',
      meta,
      { to: submission.reviewer?.email, subject: `הוקצית לסוקר: ${submission.applicationId}`, body: `בקשה ${submission.applicationId} הוקצתה לך לביקורת.` }
    )
  }

  if (['PENDING_REVISION', 'APPROVED', 'REJECTED'].includes(newStatus)) {
    await notifyUser(
      submission.authorId, type,
      `notifications.types.${type}`,
      `notifications.types.${type}`,
      meta,
      { to: submission.author?.email, subject: `עדכון בקשה: ${submission.applicationId}`, body: `הסטטוס של בקשה ${submission.applicationId} עודכן ל-${newStatus}.` }
    )
  }
}
