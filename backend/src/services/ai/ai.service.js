/**
 * Ethic-Net — AI Service Factory
 * Dispatches analysis requests to the active provider.
 *
 * All providers implement:
 *   analyze(submissionData) → Promise<resultJson>
 */

import { getAIProvider } from '../../config/services.js'
import prisma from '../../config/database.js'
import { analyze as mockAnalyze } from './mock.provider.js'
import { analyze as geminiAnalyze } from './gemini.provider.js'

const AI_PROVIDER_KEY = 'ai_provider'

/** @type {Record<string, Function>} */
const providers = {
  mock: mockAnalyze,
  gemini: geminiAnalyze,
  openai: mockAnalyze,
  azure_openai: mockAnalyze,
}

const warnedFallbacks = new Set()
const warnedRuntimeFallbacks = new Set()

/**
 * Resolves provider using DB settings first, then env fallback.
 * @returns {Promise<string>}
 */
export async function resolveConfiguredAIProvider() {
  const dbSetting = await prisma.institutionSetting.findUnique({
    where: { key: AI_PROVIDER_KEY },
    select: { value: true, isActive: true },
  })
  if (dbSetting?.isActive && String(dbSetting.value ?? '').trim()) {
    return String(dbSetting.value).trim()
  }
  return getAIProvider()
}

/**
 * Emits one-time fallback warning for missing implementations.
 * @param {string} providerName
 * @returns {void}
 */
function warnProviderFallback(providerName) {
  if (providerName === 'mock' || warnedFallbacks.has(providerName)) return
  warnedFallbacks.add(providerName)
  console.warn(`[AI] Provider "${providerName}" is not implemented. Falling back to "mock".`)
}

/**
 * Emits one-time warning when runtime errors trigger fallback.
 * @param {string} providerName
 * @param {unknown} error
 * @returns {void}
 */
function warnRuntimeFallback(providerName, error) {
  if (providerName === 'mock' || warnedRuntimeFallbacks.has(providerName)) return
  warnedRuntimeFallbacks.add(providerName)
  const reason = error instanceof Error ? error.message : 'unknown reason'
  console.warn(`[AI] Provider "${providerName}" failed (${reason}). Falling back to "mock".`)
}

/**
 * Runs an AI analysis on submission data using the active provider.
 * @param {{ title: string, track: string, dataJson: object, documents?: object[], responseLanguage?: 'he' | 'en' }} submissionData
 * @returns {Promise<{ resultJson: object, provider: string }>} Advisory result and provider used
 * @throws {Error} If AI_PROVIDER is unknown
 */
export async function analyzeSubmission(submissionData) {
  const providerName = await resolveConfiguredAIProvider()
  const analyze = providers[providerName] ?? providers.mock

  if (!providers[providerName]) {
    warnProviderFallback(providerName)
  }

  if (!analyze) {
    throw new Error(
      `Unknown AI_PROVIDER: "${providerName}". Valid options: ${Object.keys(providers).join(', ')}`
    )
  }

  try {
    const resultJson = await analyze(submissionData)
    const effectiveProvider = providers[providerName] ? providerName : 'mock'
    return { resultJson, provider: effectiveProvider }
  } catch (error) {
    warnRuntimeFallback(providerName, error)
    const resultJson = await mockAnalyze(submissionData)
    return { resultJson, provider: 'mock' }
  }
}
