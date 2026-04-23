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
  gemini: mockAnalyze,
  openai: mockAnalyze,
  azure_openai: mockAnalyze,
}

const warnedFallbacks = new Set()

/**
 * Runs an AI analysis on submission data using the active provider.
 * @param {{ title: string, track: string, dataJson: object, documents?: object[], responseLanguage?: 'he' | 'en' }} submissionData
 * @returns {Promise<object>} Advisory result JSON
 * @throws {Error} If AI_PROVIDER is unknown
 */
export async function analyzeSubmission(submissionData) {
  const providerName = getAIProvider()
  const analyze = providers[providerName]

  if (!analyze) {
    throw new Error(
      `Unknown AI_PROVIDER: "${providerName}". Valid options: ${Object.keys(providers).join(', ')}`
    )
  }

  if (providerName !== 'mock' && !warnedFallbacks.has(providerName)) {
    warnedFallbacks.add(providerName)
    console.warn(
      `[AI] Provider "${providerName}" is configured but not implemented yet. Falling back to "mock".`
    )
  }

  return analyze(submissionData)
}
