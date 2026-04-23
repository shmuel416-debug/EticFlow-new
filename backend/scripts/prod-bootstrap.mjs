/**
 * EthicFlow — Production DB bootstrap helper.
 * Runs migrate deploy + seed and rotates the admin password.
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
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing required env: ADMIN_EMAIL and ADMIN_PASSWORD')
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }
  return { adminEmail, adminPassword }
}

/**
 * Rotates admin user password hash after seeding.
 * @param {string} adminEmail
 * @param {string} adminPassword
 * @returns {Promise<void>}
 */
async function rotateAdminPassword(adminEmail, adminPassword) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12)
  const passwordHash = await bcrypt.hash(adminPassword, rounds)
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!admin) {
    throw new Error(`Admin user not found: ${adminEmail}`)
  }
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash,
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
  const { adminEmail, adminPassword } = readEnv()
  await run('npx', ['prisma', 'migrate', 'deploy'])
  await run('npx', ['prisma', 'db', 'seed'])
  await rotateAdminPassword(adminEmail, adminPassword)
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
