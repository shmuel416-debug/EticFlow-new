/**
 * EthicFlow E2E — API helpers for setup, assertions, and role auth.
 */

import { expect } from '@playwright/test'
import { USERS, ROLES, hasRoleCredentials } from './credentials'

/**
 * Performs HTTP call with optional bearer auth.
 * @param {import('@playwright/test').APIRequestContext} ctx
 * @param {string} path
 * @param {{method?:string, token?:string, body?:any}} [opts]
 * @returns {Promise<{status:number, body:any, headers:Record<string,string>}>}
 */
export async function apiCall(ctx, path, opts = {}) {
  const headers = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`

  const response = await ctx.fetch(path, {
    method: opts.method || 'GET',
    headers,
    data: opts.body,
  })

  const contentType = response.headers()['content-type'] || ''
  let body = null
  if (contentType.includes('application/json')) {
    body = await response.json()
  }

  return { status: response.status(), body, headers: response.headers() }
}

/**
 * Logs in using one role and returns its token.
 * @param {import('@playwright/test').APIRequestContext} ctx
 * @param {'RESEARCHER'|'SECRETARY'|'REVIEWER'|'CHAIRMAN'|'ADMIN'} role
 * @returns {Promise<string>}
 */
export async function loginRoleApi(ctx, role) {
  expect(hasRoleCredentials(role), `${role} credentials must be configured`).toBeTruthy()
  const credentials = USERS[role]
  const login = await apiCall(ctx, '/api/auth/login', {
    method: 'POST',
    body: credentials,
  })
  expect(login.status, `${role} login should succeed`).toBe(200)
  expect(login.body?.token).toBeTruthy()
  return login.body.token
}

/**
 * Logs in all known roles and returns role→token map.
 * @param {import('@playwright/test').APIRequestContext} ctx
 * @returns {Promise<Record<string,string>>}
 */
export async function loginAllRolesApi(ctx) {
  const tokens = {}
  for (const role of ROLES) {
    tokens[role] = await loginRoleApi(ctx, role)
  }
  return tokens
}
