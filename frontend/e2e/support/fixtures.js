/**
 * EthicFlow E2E — shared Playwright fixtures.
 */

import { test as base, expect, request } from '@playwright/test'
import { loginAllRolesApi } from './api-helpers'

/**
 * Custom fixture typing via JSDoc.
 * @typedef {Object} EfFixtures
 * @property {import('@playwright/test').APIRequestContext} apiContext
 * @property {Record<string,string>} tokens
 */

/**
 * Shared test object with API context and role tokens.
 */
export const test = base.extend(
  /** @type {import('@playwright/test').Fixtures<EfFixtures>} */ ({
    apiContext: async ({ baseURL }, applyFixture) => {
      const ctx = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
      await applyFixture(ctx)
      await ctx.dispose()
    },

    tokens: async ({ apiContext }, applyFixture) => {
      const roleTokens = await loginAllRolesApi(apiContext)
      await applyFixture(roleTokens)
    },
  })
)

export { expect }
