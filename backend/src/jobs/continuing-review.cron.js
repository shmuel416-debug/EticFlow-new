/**
 * EthicFlow — Continuing Review Cron Job
 * Sends annual review reminders for approved submissions.
 */

import cron from 'node-cron'
import { runContinuingReviewCheck } from '../services/continuing-review.service.js'

/**
 * Starts continuing-review cron.
 * @returns {void}
 */
export function startContinuingReviewCron() {
  cron.schedule('0 9 * * *', async () => {
    try {
      await runContinuingReviewCheck()
    } catch (err) {
      console.error('[ContinuingReview] Cron failed:', err.message)
    }
  }, { timezone: 'Asia/Jerusalem' })
  console.log('⏰ Continuing-review cron scheduled (daily 09:00, Asia/Jerusalem)')
}
