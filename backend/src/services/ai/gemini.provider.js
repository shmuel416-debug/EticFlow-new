/**
 * Ethic-Net — Gemini AI Provider
 * Generates advisory ethical analysis using Google Gemini.
 */

import { GoogleGenAI } from '@google/genai'
import prisma from '../../config/database.js'

const AI_MODEL_KEY = 'ai_model'
const DEFAULT_MODEL = 'gemini-1.5-flash'

/**
 * Normalizes language to supported values.
 * @param {string} language
 * @returns {'he' | 'en'}
 */
function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'he'
}

/**
 * Fetches Gemini runtime settings.
 * API key is intentionally loaded from environment only.
 * @returns {Promise<{ apiKey: string, model: string }>}
 */
async function getGeminiRuntimeSettings() {
  const modelSetting = await prisma.institutionSetting.findUnique({
    where: { key: AI_MODEL_KEY },
    select: { value: true, isActive: true },
  })
  const modelFromDb = modelSetting?.isActive ? String(modelSetting.value ?? '').trim() : ''
  return {
    apiKey: String(process.env.GEMINI_API_KEY ?? '').trim(),
    model: modelFromDb || String(process.env.GEMINI_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL,
  }
}

/**
 * Returns a display label map by field ID.
 * @param {Array<{ id: string, label: string, labelEn: string }>} fieldsMeta
 * @param {'he'|'en'} language
 * @returns {Map<string, string>}
 */
function createFieldLabelMap(fieldsMeta = [], language) {
  const entries = fieldsMeta.map((item) => [
    item.id,
    language === 'en' ? (item.labelEn || item.label || item.id) : (item.label || item.labelEn || item.id),
  ])
  return new Map(entries)
}

/**
 * Converts filtered form data to prompt-ready lines.
 * @param {Record<string, any>} dataJson
 * @param {Map<string, string>} fieldLabelById
 * @returns {string}
 */
function serializeFormAnswers(dataJson, fieldLabelById) {
  return Object.entries(dataJson)
    .map(([fieldId, value]) => `${fieldLabelById.get(fieldId) ?? fieldId}: ${JSON.stringify(value)}`)
    .join('\n')
}

/**
 * Builds the Gemini instruction prompt.
 * @param {{ title: string, track: string, dataJson: Record<string, any>, documents: object[], responseLanguage: 'he'|'en', fieldsMeta?: object[] }} submissionData
 * @returns {string}
 */
function buildPrompt(submissionData) {
  const language = normalizeLanguage(submissionData.responseLanguage)
  const fieldLabelById = createFieldLabelMap(submissionData.fieldsMeta, language)
  const answersBlock = serializeFormAnswers(submissionData.dataJson ?? {}, fieldLabelById)
  const documentsBlock = (submissionData.documents ?? [])
    .map((doc) => `- ${doc.name || 'Unnamed'} (${doc.mimeType || 'unknown'}, ${doc.sizeBytes || 0} bytes)`)
    .join('\n')
  const outputLanguage = language === 'en' ? 'English' : 'Hebrew'
  return [
    'You are an ethics committee AI assistant. Provide advisory analysis only.',
    `Respond in ${outputLanguage}.`,
    'Return valid JSON only with this schema:',
    '{"riskLevel":"LOW|MEDIUM|HIGH","score":1-10,"flags":["..."],"suggestions":["..."],"summary":"...","disclaimer":"..."}',
    `Submission title: ${submissionData.title || ''}`,
    `Track: ${submissionData.track || ''}`,
    'Form answers:',
    answersBlock || 'No selected answers.',
    'Document metadata:',
    documentsBlock || 'No documents.',
    'Guidelines: keep score realistic, actionable suggestions, and concise summary.',
  ].join('\n')
}

/**
 * Extracts plain text from Gemini response.
 * @param {any} response
 * @returns {Promise<string>}
 */
async function extractResponseText(response) {
  if (typeof response?.text === 'string') return response.text
  if (typeof response?.text === 'function') {
    const value = response.text()
    return typeof value?.then === 'function' ? await value : value
  }
  if (typeof response?.outputText === 'string') return response.outputText
  return ''
}

/**
 * Parses JSON response text safely.
 * @param {string} text
 * @returns {Record<string, any>}
 */
function parseJsonResponse(text) {
  try {
    return JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini did not return JSON')
    return JSON.parse(jsonMatch[0])
  }
}

/**
 * Normalizes risk level value to supported enum.
 * @param {unknown} riskLevel
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
function normalizeRiskLevel(riskLevel) {
  if (riskLevel === 'HIGH' || riskLevel === 'MEDIUM' || riskLevel === 'LOW') return riskLevel
  return 'MEDIUM'
}

/**
 * Normalizes any list value into a string array.
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

/**
 * Runs Gemini analysis and maps response to advisory contract.
 * @param {{ title: string, track: string, dataJson: object, documents?: object[], responseLanguage?: 'he'|'en', fieldsMeta?: object[] }} submissionData
 * @returns {Promise<object>}
 */
export async function analyze(submissionData) {
  const language = normalizeLanguage(submissionData.responseLanguage)
  const { apiKey, model } = await getGeminiRuntimeSettings()
  if (!apiKey) {
    throw new Error('Gemini API key is not configured')
  }

  const client = new GoogleGenAI({ apiKey })
  const prompt = buildPrompt({ ...submissionData, responseLanguage: language })
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  })
  const rawText = await extractResponseText(response)
  const parsed = parseJsonResponse(rawText)
  const score = Number(parsed.score)

  return {
    riskLevel: normalizeRiskLevel(parsed.riskLevel),
    score: Number.isFinite(score) ? Math.max(1, Math.min(10, Math.round(score))) : 5,
    responseLanguage: language,
    flags: normalizeStringList(parsed.flags),
    suggestions: normalizeStringList(parsed.suggestions),
    summary: String(parsed.summary ?? ''),
    disclaimer: String(
      parsed.disclaimer
      ?? (language === 'en'
        ? 'This is an AI-generated advisory analysis. It does not constitute a binding ethical decision and must be reviewed by a human committee member.'
        : 'זהו ניתוח ייעוצי שנוצר על ידי AI. הוא אינו מהווה החלטה אתית מחייבת וחייב להיבדק על ידי חבר ועדה אנושי.')
    ),
    inputCoverage: {
      answerFieldCount: Object.keys(submissionData.dataJson ?? {}).length,
      documentCount: Array.isArray(submissionData.documents) ? submissionData.documents.length : 0,
      documentCoverageMode: 'metadata_only',
    },
  }
}
