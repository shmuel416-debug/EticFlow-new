/**
 * EthicFlow — Backend Entry Point
 * Bootstraps the Express app: middleware, routes, DB connection, server start.
 * Port: process.env.API_PORT (default 5000)
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import prisma from './config/database.js'
import { logActiveProviders } from './config/services.js'
import { errorHandler } from './middleware/error.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { startSlaCron }    from './jobs/sla.cron.js'
import healthRouter        from './routes/health.routes.js'
import authRouter          from './routes/auth.routes.js'
import formsRouter         from './routes/forms.routes.js'
import submissionsRouter   from './routes/submissions.routes.js'
import notificationsRouter from './routes/notifications.routes.js'
import usersRouter         from './routes/users.routes.js'

const app  = express()
const PORT = process.env.PORT ?? process.env.API_PORT ?? 5000

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

app.use(helmet())

app.use(cors({
  origin:      process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

app.use('/api', apiLimiter)
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/forms', formsRouter)
app.use('/api/submissions',   submissionsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/users',         usersRouter)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND' })
})

// Global error handler — must be last
app.use(errorHandler)

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

/**
 * Connects to the database then starts the HTTP server.
 * @returns {Promise<void>}
 */
async function start() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`🚀 EthicFlow API running on http://localhost:${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`)
    logActiveProviders()
    startSlaCron()
  })
}

start()
