/**
 * EthicFlow — Personal Calendar Sync Retry Cron
 * Retries pending personal calendar sync jobs with backoff.
 */

import cron from 'node-cron'
import { retryPendingUserCalendarSync } from '../services/calendar/user-calendar.service.js'

/**
 * Starts periodic personal calendar sync retry worker.
 * Schedule: every 5 minutes.
 * @returns {void}
 */
export function startCalendarSyncCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const processed = await retryPendingUserCalendarSync(100)
      if (processed > 0) {
        console.log(`[CalendarSync] retried ${processed} pending personal sync jobs`)
      }
    } catch (err) {
      console.error('[CalendarSync] retry cron failed:', err.message)
    }
  })
  console.log('⏰ Calendar sync retry cron scheduled (every 5 minutes)')
}
