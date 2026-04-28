/**
 * Backward-compatible Prisma export.
 * Keeps legacy imports working while main source uses config/database.js.
 */

import prismaClient from '../config/database.js'

export const prisma = prismaClient
export default prismaClient
