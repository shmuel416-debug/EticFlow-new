/**
 * EthicFlow — SLA Cron Job
 * Runs nightly at midnight (Israel time) to check SLA breaches and send warnings.
 * Registered in index.js on server startup.
 */

import cron from 'node-cron'
import { runSlaCheck } from '../services/sla.service.js'

/**
 * Starts the nightly SLA checker cron job.
 * Schedule: 00:00 every day (server local time).
 * @returns {void}
 */
export function startSlaCron() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[SLA] Running nightly check...')
    try {
      await runSlaCheck()
    } catch (err) {
      console.error('[SLA] Cron failed:', err.message)
    }
  }, { timezone: 'Asia/Jerusalem' })
  console.log('⏰ SLA cron scheduled (daily midnight, Asia/Jerusalem)')
}
