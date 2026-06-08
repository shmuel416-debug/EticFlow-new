/**
 * Ethic-Net — Notification Service
 * Creates in-app Notification records and sends email notifications.
 * All status-change controllers call notifyUser() as a fire-and-forget side effect.
 */

import prisma from '../config/database.js'
import { sendEmail } from './email/email.service.js'
import { getNotificationType } from './status.service.js'

const SUBMISSION_RECEIVED_ROLES = ['SECRETARY', 'ADMIN']

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
 * Notifies staff that a new submission is ready for triage.
 * @param {object} submission
 * @param {string} type
 * @param {object} meta
 * @returns {Promise<void>}
 */
async function notifySubmissionReceived(submission, type, meta) {
  const recipients = await prisma.user.findMany({
    where:  { isActive: true, roles: { hasSome: SUBMISSION_RECEIVED_ROLES } },
    select: { id: true, email: true },
  })

  await Promise.all(recipients.map((recipient) => notifyUser(
    recipient.id,
    type,
    'notifications.types.SUBMISSION_RECEIVED',
    'notifications.types.SUBMISSION_RECEIVED',
    meta,
    { to: recipient.email, subject: `התקבלה בקשה חדשה: ${submission.applicationId}`, body: `בקשה ${submission.applicationId} ממתינה לבדיקה ראשונית.` }
  )))
}

/**
 * Notifies the assigned reviewer about an assignment.
 * @param {object} submission
 * @param {string} type
 * @param {object} meta
 * @returns {Promise<void>}
 */
async function notifyReviewerAssigned(submission, type, meta) {
  await notifyUser(
    submission.reviewerId, type,
    'notifications.types.SUBMISSION_ASSIGNED',
    'notifications.types.SUBMISSION_ASSIGNED',
    meta,
    { to: submission.reviewer?.email, subject: `הוקצית לסוקר: ${submission.applicationId}`, body: `בקשה ${submission.applicationId} הוקצתה לך לביקורת.` }
  )
}

/**
 * Notifies the submission author about a status update.
 * @param {object} submission
 * @param {string} type
 * @param {object} meta
 * @param {string} newStatus
 * @returns {Promise<void>}
 */
async function notifySubmissionAuthor(submission, type, meta, newStatus) {
  await notifyUser(
    submission.authorId, type,
    `notifications.types.${type}`,
    `notifications.types.${type}`,
    meta,
    { to: submission.author?.email, subject: `עדכון בקשה: ${submission.applicationId}`, body: `הסטטוס של בקשה ${submission.applicationId} עודכן ל-${newStatus}.` }
  )
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

  if (newStatus === 'SUBMITTED') {
    await notifySubmissionReceived(submission, type, meta)
    return
  }

  if (newStatus === 'ASSIGNED' && submission.reviewerId) {
    await notifyReviewerAssigned(submission, type, meta)
  }

  if (['PENDING_REVISION', 'APPROVED', 'REJECTED'].includes(newStatus)) {
    await notifySubmissionAuthor(submission, type, meta, newStatus)
  }
}
