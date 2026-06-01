/**
 * Ethic-Net — Production DB bootstrap helper.
 * Runs migrations and creates or updates the configured admin account.
 */

import { spawn } from 'node:child_process'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
 * @returns {{ adminEmail: string, adminPassword: string }}
 */
function readEnv() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'System Administrator'
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing required env: ADMIN_EMAIL and ADMIN_PASSWORD')
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }
  return { adminEmail: adminEmail.trim().toLowerCase(), adminName, adminPassword }
}

/**
 * Returns admin roles without removing any existing roles.
 * @param {string[]|null|undefined} existingRoles
 * @returns {string[]}
 */
function buildAdminRoles(existingRoles) {
  const roles = Array.isArray(existingRoles) ? existingRoles : []
  return [...new Set(['RESEARCHER', ...roles, 'ADMIN'])]
}

/**
 * Creates or updates the configured production admin account.
 * @param {string} adminEmail
 * @param {string} adminName
 * @param {string} adminPassword
 * @returns {Promise<void>}
 */
async function upsertAdmin(adminEmail, adminName, adminPassword) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const passwordHash = await bcrypt.hash(adminPassword, rounds)
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      roles: buildAdminRoles(existing?.roles),
      authProvider: 'LOCAL',
      isActive: true,
    },
    create: {
      email: adminEmail,
      fullName: adminName,
      passwordHash,
      roles: ['RESEARCHER', 'ADMIN'],
      authProvider: 'LOCAL',
      isActive: true,
    },
  })
}

/**
 * Main bootstrap entrypoint.
 * @returns {Promise<void>}
 */
async function main() {
  const { adminEmail, adminName, adminPassword } = readEnv()
  await run('npx', ['prisma', 'migrate', 'deploy'])
  await upsertAdmin(adminEmail, adminName, adminPassword)
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
