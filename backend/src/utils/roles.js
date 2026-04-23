/**
 * EthicFlow — Role Utility Helpers
 * Central helpers for multi-role users and active-role resolution.
 */

import { COMMITTEE_ROLES } from '../constants/roles.js'

export const ROLE_PRIORITY = ['ADMIN', 'CHAIRMAN', 'SECRETARY', 'REVIEWER', 'RESEARCHER']

/**
 * Returns a normalized role list for a user-like object.
 * @param {{ roles?: string[], role?: string }} [user]
 * @returns {string[]}
 */
export function getRoleList(user) {
  if (Array.isArray(user?.roles) && user.roles.length > 0) return user.roles
  if (typeof user?.role === 'string') return [user.role]
  return ['RESEARCHER']
}

/**
 * Returns true when user has a specific role.
 * @param {{ roles?: string[], role?: string }} [user]
 * @param {string} role
 * @returns {boolean}
 */
export function hasRole(user, role) {
  return getRoleList(user).includes(role)
}

/**
 * Returns true when user has any role from the provided list.
 * @param {{ roles?: string[], role?: string }} [user]
 * @param {...string} roles
 * @returns {boolean}
 */
export function hasAnyRole(user, ...roles) {
  const userRoles = getRoleList(user)
  return roles.some((role) => userRoles.includes(role))
}

/**
 * Returns true when user is part of committee roles.
 * @param {{ roles?: string[], role?: string }} [user]
 * @returns {boolean}
 */
export function isCommitteeMember(user) {
  return hasAnyRole(user, ...COMMITTEE_ROLES)
}

/**
 * Returns highest-priority role from role list.
 * @param {{ roles?: string[], role?: string }} [user]
 * @returns {string}
 */
export function getPrimaryRole(user) {
  const roles = getRoleList(user)
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'RESEARCHER'
}

/**
 * Returns the active role from request context.
 * @param {import('express').Request} req
 * @returns {string}
 */
export function getRequestRole(req) {
  if (typeof req?.user?.activeRole === 'string') return req.user.activeRole
  return getPrimaryRole(req?.user)
}
