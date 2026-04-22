/**
 * EthicFlow — Status Configuration Service
 * Provides cached status metadata, transitions, and permission checks.
 */

import prisma from '../config/database.js'

const CACHE_TTL_MS = 60_000

const DEFAULT_STATUS_CONFIG = [
  { code: 'DRAFT', labelHe: 'טיוטה', labelEn: 'Draft', color: '#64748b', orderIndex: 10, isInitial: true, isTerminal: false, slaPhase: null, notificationType: null },
  { code: 'SUBMITTED', labelHe: 'הוגש', labelEn: 'Submitted', color: '#2563eb', orderIndex: 20, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: 'SUBMISSION_RECEIVED' },
  { code: 'IN_TRIAGE', labelHe: 'בבדיקה ראשונית', labelEn: 'In Triage', color: '#ca8a04', orderIndex: 30, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: null },
  { code: 'ASSIGNED', labelHe: 'הוקצה לסוקר', labelEn: 'Assigned', color: '#ea580c', orderIndex: 40, isInitial: false, isTerminal: false, slaPhase: 'REVIEW', notificationType: 'SUBMISSION_ASSIGNED' },
  { code: 'IN_REVIEW', labelHe: 'בביקורת', labelEn: 'In Review', color: '#7c3aed', orderIndex: 50, isInitial: false, isTerminal: false, slaPhase: 'APPROVAL', notificationType: 'REVIEW_REQUESTED' },
  { code: 'PENDING_REVISION', labelHe: 'ממתין לתיקון', labelEn: 'Pending Revision', color: '#dc2626', orderIndex: 60, isInitial: false, isTerminal: false, slaPhase: null, notificationType: 'REVISION_REQUIRED' },
  { code: 'APPROVED', labelHe: 'אושר', labelEn: 'Approved', color: '#16a34a', orderIndex: 70, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'APPROVED' },
  { code: 'REJECTED', labelHe: 'נדחה', labelEn: 'Rejected', color: '#b91c1c', orderIndex: 80, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'REJECTED' },
  { code: 'WITHDRAWN', labelHe: 'בוטל', labelEn: 'Withdrawn', color: '#6b7280', orderIndex: 90, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null },
  { code: 'CONTINUED', labelHe: 'המשך', labelEn: 'Continued', color: '#0d9488', orderIndex: 100, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null },
]

const DEFAULT_TRANSITIONS = [
  { fromCode: 'SUBMITTED', toCode: 'IN_TRIAGE', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'ASSIGNED', toCode: 'IN_REVIEW', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'IN_REVIEW', toCode: 'APPROVED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'REJECTED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'PENDING_REVISION', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
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
  const transitions = allTransitions.filter((transition) => {
    const roleAllowed = (transition.allowedRoles || []).includes(userRole)
    if (!roleAllowed) return false
    if (transition.requireReviewerAssigned && !submission?.reviewerId) return false
    return true
  })
  return {
    next: transitions.map((transition) => transition.toCode),
    transitions,
  }
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
