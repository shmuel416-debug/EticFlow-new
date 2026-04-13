/**
 * EthicFlow — SLA Service
 * Business days calculator and SLA due-date management.
 * Business days: Sun–Thu (skip Fri/Sat = Israeli weekend).
 * SLA windows (from spec): triage=3bd, review=14bd, revision=30cd, approval=5bd.
 */

import prisma from '../config/database.js'
import { notifyUser } from './notification.service.js'

/** SLA windows in business days. */
const SLA = { TRIAGE: 3, REVIEW: 14, APPROVAL: 5 }

/**
 * Adds N business days to a date (Sun–Thu; skips Fri/Sat).
 * @param {Date}   from  - Start date
 * @param {number} days  - Business days to add
 * @returns {Date}
 */
export function addBusinessDays(from, days) {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 5 && dow !== 6) added++ // skip Fri(5) + Sat(6)
  }
  return d
}

/**
 * Returns days remaining until due date (negative = breached).
 * @param {Date|string|null} due
 * @returns {number|null}
 */
export function daysUntil(due) {
  if (!due) return null
  return Math.ceil((new Date(due) - Date.now()) / 86400000)
}

/**
 * Sets SLA due dates when a submission advances to a new status.
 * Called from status-transition controller.
 * @param {string} submissionId
 * @param {string} newStatus
 * @returns {Promise<void>}
 */
export async function setDueDates(submissionId, newStatus) {
  const now = new Date()
  const updates = {}

  if (newStatus === 'SUBMITTED')  updates.triageDue    = addBusinessDays(now, SLA.TRIAGE)
  if (newStatus === 'ASSIGNED')   updates.reviewDue    = addBusinessDays(now, SLA.REVIEW)
  if (newStatus === 'IN_REVIEW')  updates.approvalDue  = addBusinessDays(now, SLA.APPROVAL)
  if (newStatus === 'IN_TRIAGE')  updates.triageCompleted = now
  if (newStatus === 'ASSIGNED')   updates.triageCompleted = now
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') updates.reviewCompleted = now

  if (Object.keys(updates).length) {
    await prisma.sLATracking.update({ where: { submissionId }, data: updates })
  }
}

/**
 * Checks all active SLAs for breaches and warnings.
 * Sends notifications. Run nightly via cron.
 * @returns {Promise<{ warnings: number, breaches: number }>}
 */
export async function runSlaCheck() {
  const active = await prisma.sLATracking.findMany({
    where:   { submission: { status: { notIn: ['APPROVED','REJECTED','WITHDRAWN','DRAFT'] } } },
    include: { submission: { include: { author: true, reviewer: true } } },
  })

  let warnings = 0, breaches = 0

  for (const sla of active) {
    const sub  = sla.submission
    const due  = sla.reviewDue ?? sla.triageDue ?? sla.approvalDue
    const days = daysUntil(due)
    if (days === null) continue

    if (days < 0 && !sla.isBreached) {
      breaches++
      await prisma.sLATracking.update({ where: { id: sla.id }, data: { isBreached: true } })
      await notifyUser(sub.authorId, 'SLA_BREACH', 'notifications.types.SLA_BREACH',
        'notifications.types.SLA_BREACH', { applicationId: sub.applicationId })
    } else if (days <= 2 && sla.warningsSent < 1) {
      warnings++
      await prisma.sLATracking.update({ where: { id: sla.id }, data: { warningsSent: 1 } })
      await notifyUser(sub.authorId, 'SLA_WARNING', 'notifications.types.SLA_WARNING',
        'notifications.types.SLA_WARNING', { applicationId: sub.applicationId, days })
    }
  }

  console.log(`[SLA] check done — ${warnings} warnings, ${breaches} breaches`)
  return { warnings, breaches }
}
