/**
 * EthicFlow — Health Check Route
 * GET /api/health — returns server + DB status.
 * Used by load balancers, Docker healthchecks, and monitoring.
 */

import { Router } from 'express'
import prisma from '../config/database.js'

const router = Router()

/**
 * Health check endpoint.
 * Pings the database and returns overall system status.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
router.get('/', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status:      'ok',
      timestamp:   new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      database:    'connected',
    })
  } catch {
    res.status(503).json({
      status:    'error',
      timestamp: new Date().toISOString(),
      database:  'disconnected',
    })
  }
})

export default router
