/**
 * Ethic-Net — Test/Demo User Cleanup
 *
 * Removes every user whose email is on the demo domain (@test.com). These
 * accounts share a weak password and must never exist in production.
 *
 * Strategy per user (production-safe):
 *   1. Hard delete when the user has no blocking related rows. Owned, safe
 *      children (refresh tokens, auth exchange codes, notifications) are removed
 *      first, and audit-log rows are detached (userId -> null) to preserve the
 *      immutable audit trail.
 *   2. If a hard delete is blocked by foreign keys (the user authored
 *      submissions, comments, votes, signatures, etc.), the account is
 *      neutralized instead: deactivated, credentials cleared, and the email
 *      rewritten off the @test.com domain so it can no longer be used and no
 *      @test.com user remains.
 *
 * Usage:
 *   node scripts/cleanup-test-users.mjs            # perform cleanup
 *   node scripts/cleanup-test-users.mjs --dry-run  # report only, no changes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_EMAIL_DOMAIN = '@test.com'

/**
 * Hard-deletes a user after removing safe owned child rows and detaching audit logs.
 * Runs in a single transaction so a foreign-key failure rolls everything back.
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function hardDelete(userId) {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.authExchangeCode.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.auditLog.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
}

/**
 * Neutralizes a user that cannot be hard-deleted: disables login, clears
 * credentials/tokens, revokes sessions, and rewrites the email off @test.com.
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function neutralize(userId) {
  const tombstoneEmail = `removed.${userId}@deactivated.invalid`
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId } }),
    prisma.authExchangeCode.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: tombstoneEmail,
        isActive: false,
        passwordHash: null,
        externalId: null,
        authProvider: 'LOCAL',
        calendarAccessToken: null,
        calendarRefreshToken: null,
        calendarTokenExpiry: null,
        resetToken: null,
        resetTokenExpiry: null,
      },
    }),
  ])
}

/**
 * Main entry point.
 * @returns {Promise<void>}
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const users = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  })

  if (users.length === 0) {
    console.log(`[cleanup-test-users] No ${TEST_EMAIL_DOMAIN} users found. Nothing to do.`)
    return
  }

  console.log(`[cleanup-test-users] Found ${users.length} ${TEST_EMAIL_DOMAIN} user(s).`)
  if (dryRun) {
    users.forEach((u) => console.log(`  • would remove: ${u.email}`))
    console.log('[cleanup-test-users] Dry run — no changes made.')
    return
  }

  let deleted = 0
  let neutralized = 0

  for (const user of users) {
    try {
      await hardDelete(user.id)
      deleted += 1
      console.log(`  ✓ deleted: ${user.email}`)
    } catch {
      await neutralize(user.id)
      neutralized += 1
      console.log(`  ✓ neutralized (had related records): ${user.email}`)
    }
  }

  console.log(`[cleanup-test-users] Done. Deleted: ${deleted}, neutralized: ${neutralized}.`)
}

main()
  .catch((error) => {
    console.error('[cleanup-test-users] Failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
