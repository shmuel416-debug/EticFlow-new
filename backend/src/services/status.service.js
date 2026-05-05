/**
 * EthicFlow — Status Configuration Service
 * Provides cached status metadata, transitions, and permission checks.
 */

import prisma from '../config/database.js'

const CACHE_TTL_MS = 60_000

const DEFAULT_STATUS_CONFIG = [
  { code: 'DRAFT', labelHe: 'טיוטה', labelEn: 'Draft', descriptionHe: 'הבקשה נשמרה כטיוטה ועדיין לא נשלחה לבדיקה.', descriptionEn: 'The submission is saved as draft and has not been sent for review yet.', color: '#64748b', orderIndex: 10, isInitial: true, isTerminal: false, slaPhase: null, notificationType: null },
  { code: 'SUBMITTED', labelHe: 'הוגש', labelEn: 'Submitted', descriptionHe: 'הבקשה התקבלה במערכת וממתינה לבדיקת מזכירת הוועדה.', descriptionEn: 'The submission was received and is waiting for secretary intake review.', color: '#2563eb', orderIndex: 20, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: 'SUBMISSION_RECEIVED' },
  { code: 'IN_TRIAGE', labelHe: 'בבדיקה ראשונית', labelEn: 'In Triage', descriptionHe: 'מבוצעת בדיקת שלמות מסמכים והתאמה לתהליך לפני הקצאה לסוקר.', descriptionEn: 'The request is being triaged for completeness before reviewer assignment.', color: '#ca8a04', orderIndex: 30, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: null },
  { code: 'ASSIGNED', labelHe: 'הוקצה לסוקר', labelEn: 'Assigned', descriptionHe: 'הבקשה הוקצתה לסוקר שמתחיל כעת בבדיקה מקצועית.', descriptionEn: 'A reviewer has been assigned and can now start the formal review.', color: '#ea580c', orderIndex: 40, isInitial: false, isTerminal: false, slaPhase: 'REVIEW', notificationType: 'SUBMISSION_ASSIGNED' },
  { code: 'IN_REVIEW', labelHe: 'בביקורת', labelEn: 'In Review', descriptionHe: 'הסקירה המקצועית הוגשה וממתינים להחלטת יו״ר הוועדה.', descriptionEn: 'The review is in progress or completed and awaiting chairman decision.', color: '#7c3aed', orderIndex: 50, isInitial: false, isTerminal: false, slaPhase: 'APPROVAL', notificationType: 'REVIEW_REQUESTED' },
  { code: 'PENDING_REVISION', labelHe: 'ממתין לתיקון', labelEn: 'Pending Revision', descriptionHe: 'נדרשים תיקונים מצד החוקר/ת לפני המשך הדיון בבקשה.', descriptionEn: 'The committee requested revisions before the process can continue.', color: '#dc2626', orderIndex: 60, isInitial: false, isTerminal: false, slaPhase: null, notificationType: 'REVISION_REQUIRED' },
  { code: 'APPROVED', labelHe: 'אושר', labelEn: 'Approved', descriptionHe: 'הבקשה אושרה סופית על ידי הוועדה.', descriptionEn: 'The submission has been formally approved by the committee.', color: '#16a34a', orderIndex: 70, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'APPROVED' },
  { code: 'REJECTED', labelHe: 'נדחה', labelEn: 'Rejected', descriptionHe: 'הבקשה נדחתה וההליך נסגר ללא אישור.', descriptionEn: 'The submission was rejected and the review workflow is closed.', color: '#b91c1c', orderIndex: 80, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'REJECTED' },
  { code: 'WITHDRAWN', labelHe: 'בוטל', labelEn: 'Withdrawn', descriptionHe: 'הבקשה בוטלה על ידי החוקר/ת או המזכירות.', descriptionEn: 'The submission was withdrawn by the researcher or secretary.', color: '#6b7280', orderIndex: 90, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null },
  { code: 'CONTINUED', labelHe: 'המשך', labelEn: 'Continued', descriptionHe: 'הבקשה הועברה להמשך טיפול בתהליך נפרד.', descriptionEn: 'The submission was marked for continuation in a separate process.', color: '#0d9488', orderIndex: 100, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null },
]

const DEFAULT_TRANSITIONS = [
  { fromCode: 'DRAFT', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'SUBMITTED', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'SUBMITTED', toCode: 'IN_TRIAGE', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_TRIAGE', toCode: 'WITHDRAWN', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'ASSIGNED', toCode: 'WITHDRAWN', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'ASSIGNED', toCode: 'IN_REVIEW', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'IN_REVIEW', toCode: 'APPROVED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'REJECTED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'PENDING_REVISION', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'PENDING_REVISION', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'PENDING_REVISION', toCode: 'SUBMITTED', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
]

let cache = null
let cacheAt = 0

/**
 * Invalidates the in-memory status cache.
 * @returns {void}
 */
export function invalidateStatusCache() {
  cache = null
  cacheAt = 0
}

/**
 * Checks whether the cache is still fresh.
 * @returns {boolean}
 */
function isCacheFresh() {
  return Boolean(cache) && Date.now() - cacheAt < CACHE_TTL_MS
}

/**
 * Builds a default in-memory config when DB tables are unavailable.
 * @returns {{ statuses: any[], statusByCode: Record<string, any>, transitionsByFromCode: Record<string, any[]>, permissionByStatusRoleAction: Record<string, boolean> }}
 */
function buildFallbackConfig() {
  const statusByCode = Object.fromEntries(DEFAULT_STATUS_CONFIG.map((status) => [status.code, status]))
  const transitionsByFromCode = {}
  for (const transition of DEFAULT_TRANSITIONS) {
    transitionsByFromCode[transition.fromCode] ??= []
    transitionsByFromCode[transition.fromCode].push(transition)
  }

  const permissionByStatusRoleAction = {}
  const roles = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']
  const actions = ['VIEW', 'EDIT', 'COMMENT', 'UPLOAD_DOC', 'DELETE_DOC', 'VIEW_INTERNAL', 'TRANSITION', 'ASSIGN', 'SUBMIT_REVIEW', 'RECORD_DECISION']
  for (const status of DEFAULT_STATUS_CONFIG) {
    for (const role of roles) {
      for (const action of actions) {
        const key = `${status.code}:${role}:${action}`
        permissionByStatusRoleAction[key] = false
      }
    }
  }

  return {
    statuses: DEFAULT_STATUS_CONFIG,
    statusByCode,
    transitionsByFromCode,
    permissionByStatusRoleAction,
  }
}

/**
 * Loads statuses, transitions, and permissions from DB.
 * Falls back to built-in defaults when tables are not ready.
 * @returns {Promise<any>}
 */
async function loadConfig() {
  if (isCacheFresh()) return cache

  try {
    const statuses = await prisma.submissionStatus.findMany({
      where: { isActive: true },
      orderBy: [{ orderIndex: 'asc' }, { code: 'asc' }],
      include: {
        transitionsFrom: {
          where: { isActive: true },
          include: {
            toStatus: { select: { code: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        permissions: {
          where: { isActive: true },
          select: { role: true, action: true, allowed: true },
        },
      },
    })

    const statusByCode = {}
    const transitionsByFromCode = {}
    const permissionByStatusRoleAction = {}

    for (const status of statuses) {
      statusByCode[status.code] = {
        code: status.code,
        labelHe: status.labelHe,
        labelEn: status.labelEn,
        descriptionHe: status.descriptionHe,
        descriptionEn: status.descriptionEn,
        color: status.color,
        orderIndex: status.orderIndex,
        isInitial: status.isInitial,
        isTerminal: status.isTerminal,
        slaPhase: status.slaPhase,
        notificationType: status.notificationType,
        isSystem: status.isSystem,
      }

      transitionsByFromCode[status.code] = status.transitionsFrom.map((transition) => ({
        fromCode: status.code,
        toCode: transition.toStatus.code,
        allowedRoles: transition.allowedRoles || [],
        requireReviewerAssigned: Boolean(transition.requireReviewerAssigned),
      }))

      for (const permission of status.permissions) {
        permissionByStatusRoleAction[`${status.code}:${permission.role}:${permission.action}`] = Boolean(permission.allowed)
      }
    }

    cache = {
      statuses: Object.values(statusByCode),
      statusByCode,
      transitionsByFromCode,
      permissionByStatusRoleAction,
    }
  } catch (_err) {
    cache = buildFallbackConfig()
  }

  cacheAt = Date.now()
  return cache
}

/**
 * Lists configured statuses.
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {Promise<any[]>}
 */
export async function listStatuses(options = {}) {
  const config = await loadConfig()
  if (options.activeOnly === false) return config.statuses
  return config.statuses
}

/**
 * Gets one status config by code.
 * @param {string} statusCode
 * @returns {Promise<any|null>}
 */
export async function getStatus(statusCode) {
  const config = await loadConfig()
  return config.statusByCode[statusCode] ?? null
}

/**
 * Resolves whether an action is allowed in a status for a role.
 * @param {string} action
 * @param {string} statusCode
 * @param {string} userRole
 * @returns {Promise<boolean>}
 */
export async function can(action, statusCode, userRole) {
  const config = await loadConfig()
  const key = `${statusCode}:${userRole}:${action}`
  if (Object.prototype.hasOwnProperty.call(config.permissionByStatusRoleAction, key)) {
    return Boolean(config.permissionByStatusRoleAction[key])
  }
  return false
}

/**
 * Gets transition targets allowed for a role from a given status.
 * @param {string} currentCode
 * @param {string} userRole
 * @param {object} [submission]
 * @returns {Promise<{ next: string[], transitions: any[] }>}
 */
export async function getAllowedTransitions(currentCode, userRole, submission = null) {
  const config = await loadConfig()
  const allTransitions = config.transitionsByFromCode[currentCode] ?? []
  const transitions = allTransitions.filter((transition) =>
    isTransitionAllowed(transition, userRole, submission)
  )
  return {
    next: transitions.map((transition) => transition.toCode),
    transitions,
  }
}

/**
 * Resolves whether a single transition is valid for role and submission context.
 * @param {{ allowedRoles?: string[], requireReviewerAssigned?: boolean }} transition
 * @param {string} userRole
 * @param {object|null} [submission]
 * @returns {boolean}
 */
export function isTransitionAllowed(transition, userRole, submission = null) {
  const roleAllowed = (transition.allowedRoles || []).includes(userRole)
  if (!roleAllowed) return false
  if (transition.requireReviewerAssigned && !submission?.reviewerId) return false
  return true
}

/**
 * Returns the SLA phase for a status code.
 * @param {string} statusCode
 * @returns {Promise<string|null>}
 */
export async function getSlaPhase(statusCode) {
  const status = await getStatus(statusCode)
  return status?.slaPhase ?? null
}

/**
 * Returns the notification type for a status code.
 * @param {string} statusCode
 * @returns {Promise<string|null>}
 */
export async function getNotificationType(statusCode) {
  const status = await getStatus(statusCode)
  return status?.notificationType ?? null
}

/**
 * Returns a list of terminal status codes.
 * @returns {Promise<string[]>}
 */
export async function getTerminalCodes() {
  const statuses = await listStatuses()
  return statuses.filter((status) => status.isTerminal).map((status) => status.code)
}

/**
 * Returns a list of non-terminal status codes.
 * @returns {Promise<string[]>}
 */
export async function getNonTerminalCodes() {
  const statuses = await listStatuses()
  return statuses.filter((status) => !status.isTerminal).map((status) => status.code)
}
