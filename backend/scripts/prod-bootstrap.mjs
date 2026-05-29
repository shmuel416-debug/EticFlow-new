/**
 * EthicFlow — Production DB bootstrap helper.
 * Runs migrations and creates or rotates the initial production admin user.
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
 * Validates required env values for admin bootstrap.
 * @returns {{ adminEmail: string, adminName: string|null, adminPassword: string }}
 */
function readEnv() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminName = process.env.ADMIN_NAME?.trim() || null
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing required env: ADMIN_EMAIL and ADMIN_PASSWORD')
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }
  return { adminEmail, adminName, adminPassword }
}

/**
 * Creates or rotates the production admin user without loading dev seed data.
 * @param {string} adminEmail
 * @param {string|null} adminName
 * @param {string} adminPassword
 * @returns {Promise<void>}
 */
async function upsertProductionAdmin(adminEmail, adminName, adminPassword) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const passwordHash = await bcrypt.hash(adminPassword, rounds)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      ...(adminName ? { fullName: adminName } : {}),
      roles: ['RESEARCHER', 'ADMIN'],
      authProvider: 'LOCAL',
      externalId: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: adminName || 'System Administrator',
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
  await upsertProductionAdmin(adminEmail, adminName, adminPassword)
  console.log('[EthicFlow] Production bootstrap completed successfully.')
}

main()
  .catch((error) => {
    console.error('[EthicFlow] Bootstrap failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
