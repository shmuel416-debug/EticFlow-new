/**
 * Ethic-Net — Production DB bootstrap helper.
 * Runs migrate deploy and creates or rotates the configured admin user.
 */

import { spawn } from 'node:child_process'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DEFAULT_ADMIN_ROLES = ['RESEARCHER', 'ADMIN']

/**
 * Runs a child process command and streams output.
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')}`))
    })
  })
}

/**
 * Validates required env values for password rotation.
 * @returns {{ adminEmail: string, adminPassword: string, adminName: string }}
 */
function readEnv() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Institution Admin'
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing required env: ADMIN_EMAIL and ADMIN_PASSWORD')
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }
  return { adminEmail, adminPassword, adminName }
}

/**
 * Ensures the configured admin account exists and has ADMIN access.
 * @param {string[]} roles
 * @returns {string[]}
 */
function ensureAdminRoles(roles = []) {
  return Array.from(new Set([...roles, ...DEFAULT_ADMIN_ROLES]))
}

/**
 * Creates or updates the configured local admin account.
 * @param {string} adminEmail
 * @param {string} adminPassword
 * @param {string} adminName
 * @returns {Promise<void>}
 */
async function upsertAdminUser(adminEmail, adminPassword, adminName) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const passwordHash = await bcrypt.hash(adminPassword, rounds)
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  const data = { passwordHash, authProvider: 'LOCAL', isActive: true }

  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { ...data, roles: ensureAdminRoles(admin.roles) },
    })
    return
  }

  await prisma.user.create({
    data: {
      ...data,
      email: adminEmail,
      fullName: adminName,
      roles: DEFAULT_ADMIN_ROLES,
    },
  })
}

/**
 * Main bootstrap entrypoint.
 * @returns {Promise<void>}
 */
async function main() {
  const { adminEmail, adminPassword, adminName } = readEnv()
  await run('npx', ['prisma', 'migrate', 'deploy'])
  await upsertAdminUser(adminEmail, adminPassword, adminName)
  console.log('[Ethic-Net] Production bootstrap completed successfully.')
}

main()
  .catch((error) => {
    console.error('[Ethic-Net] Bootstrap failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
