/**
 * Ethic-Net — Production DB bootstrap helper.
 * Runs migrate deploy and upserts the configured production admin.
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
 * Validates required env values for production bootstrap.
 * @returns {{ adminEmail: string, adminPassword: string, adminName: string }}
 */
function readEnv() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing required env: ADMIN_EMAIL and ADMIN_PASSWORD')
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }
  const adminName = process.env.ADMIN_NAME || 'System Administrator'
  return { adminEmail, adminPassword, adminName }
}

/**
 * Ensures the role list contains the required production admin roles.
 * @param {string[]|undefined|null} roles
 * @returns {string[]}
 */
function mergeAdminRoles(roles) {
  return [...new Set([...(Array.isArray(roles) ? roles : []), 'RESEARCHER', 'ADMIN'])]
}

/**
 * Upserts the configured production admin without loading development fixtures.
 * @param {string} adminEmail
 * @param {string} adminPassword
 * @param {string} adminName
 * @returns {Promise<void>}
 */
async function upsertProductionAdmin(adminEmail, adminPassword, adminName) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const passwordHash = await bcrypt.hash(adminPassword, rounds)
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        authProvider: 'LOCAL',
        isActive: true,
        roles: mergeAdminRoles(existing.roles),
      },
    })
    return
  }

  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: adminName,
      passwordHash,
      authProvider: 'LOCAL',
      roles: ['RESEARCHER', 'ADMIN'],
      isActive: true,
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
  await upsertProductionAdmin(adminEmail, adminPassword, adminName)
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
