/**
 * EthicFlow — SLA Service
 * Business days calculator and SLA due-date management.
 * Business days: Sun–Thu (skip Fri/Sat = Israeli weekend).
 * SLA windows (from spec): triage=3bd, review=14bd, revision=30cd, approval=5bd.
 */

import prisma from '../config/database.js'
import { notifyUser } from './notification.service.js'
import { getNonTerminalCodes, getSlaPhase } from './status.service.js'

/** SLA windows in business days. */
const SLA = { TRIAGE: 3, REVIEW: 14, APPROVAL: 5 }
const DEFAULT_REVISION_DAYS = 30
const DEFAULT_TIMEZONE = 'Asia/Jerusalem'

/**
 * Loads SLA settings from institution settings table.
 * @returns {Promise<{ triage:number, review:number, approval:number, revision:number, holidays:Set<string>, timezone:string }>}
 */
async function getSlaSettings() {
  const rows = await prisma.institutionSetting.findMany({
    where: {
      key: {
        in: [
          'sla_triage_days',
          'sla_review_days',
          'sla_approval_days',
          'sla_revision_days',
          'sla_holidays',
          'timezone',
        ],
      },
      isActive: true,
    },
  })
  const map = Object.fromEntries(rows.map((item) => [item.key, item.value]))
  let holidayValues = []
  try {
    const parsed = JSON.parse(map.sla_holidays || '[]')
    if (Array.isArray(parsed)) holidayValues = parsed
  } catch {
    holidayValues = []
  }
  return {
    triage: parseInt(map.sla_triage_days ?? String(SLA.TRIAGE), 10),
    review: parseInt(map.sla_review_days ?? String(SLA.REVIEW), 10),
    approval: parseInt(map.sla_approval_days ?? String(SLA.APPROVAL), 10),
    revision: parseInt(map.sla_revision_days ?? String(DEFAULT_REVISION_DAYS), 10),
    holidays: new Set(holidayValues.map((v) => String(v))),
    timezone: map.timezone || DEFAULT_TIMEZONE,
  }
}

/**
 * Formats date as YYYY-MM-DD in Israel timezone.
 * @param {Date} date
 * @returns {string}
 */
function formatDayKey(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || DEFAULT_TIMEZONE }).format(date)
}

/**
 * Adds N business days to a date (Sun–Thu; skips Fri/Sat).
 * @param {Date}   from  - Start date
 * @param {number} days  - Business days to add
 * @returns {Date}
 */
export function addBusinessDays(from, days, holidays = new Set(), timezone = DEFAULT_TIMEZONE) {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    const dayKey = formatDayKey(d, timezone)
    if (dow !== 5 && dow !== 6 && !holidays.has(dayKey)) added++ // skip Fri/Sat + configured holidays
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
  const phase = await getSlaPhase(newStatus)
  const settings = await getSlaSettings()

  if (newStatus === 'SUBMITTED' || phase === 'TRIAGE') updates.triageDue = addBusinessDays(now, settings.triage, settings.holidays, settings.timezone)
  if (newStatus === 'ASSIGNED' || phase === 'REVIEW') updates.reviewDue = addBusinessDays(now, settings.review, settings.holidays, settings.timezone)
  if (newStatus === 'IN_REVIEW' || phase === 'APPROVAL') updates.approvalDue = addBusinessDays(now, settings.approval, settings.holidays, settings.timezone)
  if (newStatus === 'PENDING_REVISION') updates.revisionDue = new Date(Date.now() + settings.revision * 86400000)
  if (newStatus === 'IN_TRIAGE' || newStatus === 'ASSIGNED') updates.triageCompleted = now
  if (phase === 'COMPLETED' || ['APPROVED', 'REJECTED', 'WITHDRAWN'].includes(newStatus)) updates.reviewCompleted = now

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
  const settings = await getSlaSettings()
  const nonTerminalCodes = await getNonTerminalCodes()
  const active = await prisma.sLATracking.findMany({
    where:   { submission: { status: { in: nonTerminalCodes } } },
    include: { submission: { include: { author: true, reviewer: true } } },
  })
  const escalationUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['SECRETARY', 'CHAIRMAN', 'ADMIN'] },
    },
    select: { id: true },
  })

  let warnings = 0, breaches = 0

  for (const sla of active) {
    const sub  = sla.submission
    const due  = sla.revisionDue ?? sla.reviewDue ?? sla.triageDue ?? sla.approvalDue
    const days = daysUntil(due)
    if (days === null) continue

    if (days < 0 && !sla.isBreached) {
      breaches++
      await prisma.sLATracking.update({ where: { id: sla.id }, data: { isBreached: true } })
      await notifyUser(sub.authorId, 'SLA_BREACH', 'notifications.types.SLA_BREACH',
        'notifications.types.SLA_BREACH', { applicationId: sub.applicationId })
      for (const target of escalationUsers) {
        await notifyUser(target.id, 'SLA_BREACH', 'notifications.types.SLA_BREACH',
          'notifications.types.SLA_BREACH', { applicationId: sub.applicationId })
      }
    } else if (days <= 2 && sla.warningsSent < 1) {
      warnings++
      await prisma.sLATracking.update({ where: { id: sla.id }, data: { warningsSent: 1 } })
      await notifyUser(sub.authorId, 'SLA_WARNING', 'notifications.types.SLA_WARNING',
        'notifications.types.SLA_WARNING', { applicationId: sub.applicationId, days })
      for (const target of escalationUsers) {
        await notifyUser(target.id, 'SLA_WARNING', 'notifications.types.SLA_WARNING',
          'notifications.types.SLA_WARNING', { applicationId: sub.applicationId, days })
      }
    }
  }

  console.log(`[SLA] check done (${settings.timezone}) — ${warnings} warnings, ${breaches} breaches`)
  return { warnings, breaches }
}
