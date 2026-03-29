/**
 * EthicFlow — Prisma Client Singleton
 * Exports a single shared PrismaClient instance for the entire app.
 * Prevents multiple connections being opened during hot-reload in dev.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

export default prisma
