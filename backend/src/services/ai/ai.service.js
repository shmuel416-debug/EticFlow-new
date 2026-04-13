/**
 * EthicFlow — AI Service Factory
 * Dispatches analysis requests to the active provider based on AI_PROVIDER env var.
 *
 * Providers: mock (dev/test) | gemini (prod)
 * Swap provider: change AI_PROVIDER in .env and restart.
 *
 * All providers implement:
 *   analyze(submissionData) → Promise<resultJson>
 */

import { getAIProvider } from '../../config/services.js'
import { analyze as mockAnalyze } from './mock.provider.js'

/** @type {Record<string, Function>} */
const providers = {
  mock: mockAnalyze,
  // gemini: geminiAnalyze — added when API key is available
}

/**
 * Runs an AI analysis on submission data using the active provider.
 * @param {{ title: string, track: string, dataJson: object }} submissionData
 * @returns {Promise<object>} Advisory result JSON
 * @throws {Error} If AI_PROVIDER is unknown
 */
export async function analyzeSubmission(submissionData) {
  const providerName = getAIProvider()
  const analyze      = providers[providerName]

  if (!analyze) {
    throw new Error(`Unknown AI_PROVIDER: "${providerName}". Valid options: ${Object.keys(providers).join(', ')}`)
  }

  return analyze(submissionData)
}
