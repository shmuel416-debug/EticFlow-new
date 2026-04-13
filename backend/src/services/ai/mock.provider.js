/**
 * EthicFlow — AI Mock Provider
 * Returns deterministic, rule-based analysis without any external API call.
 * Used in development and testing. The result shape is identical to the
 * Gemini provider so the consumer never needs to know which is active.
 *
 * Result JSON shape:
 * {
 *   riskLevel:    'LOW' | 'MEDIUM' | 'HIGH',
 *   score:        number (1–10, advisory),
 *   flags:        string[],      // potential concerns
 *   suggestions:  string[],      // improvement hints
 *   summary:      string,        // one-paragraph narrative
 *   disclaimer:   string,        // mandatory advisory notice
 * }
 */

// ─────────────────────────────────────────────
// RULE DEFINITIONS
// ─────────────────────────────────────────────

/** Keywords that raise a HIGH flag. */
const HIGH_RISK_KEYWORDS = [
  'children', 'minors', 'vulnerable', 'prisoner', 'genetic', 'embryo',
  'ילדים', 'קטינים', 'אוכלוסיה פגיעה', 'אסיר', 'גנטי', 'עובר',
]

/** Keywords that raise a MEDIUM flag. */
const MEDIUM_RISK_KEYWORDS = [
  'deception', 'placebo', 'control group', 'blood', 'biopsy', 'invasive',
  'הטעיה', 'פלסבו', 'קבוצת ביקורת', 'דם', 'ביופסיה', 'פולשני',
]

// ─────────────────────────────────────────────
// ANALYSIS FUNCTION
// ─────────────────────────────────────────────

/**
 * Analyses a submission's data and returns an advisory result.
 * @param {{ title: string, track: string, dataJson: object }} submissionData
 * @returns {Promise<object>} Advisory result JSON
 */
export async function analyze(submissionData) {
  const { title = '', track = 'FULL', dataJson = {} } = submissionData

  // Combine all text for keyword scanning
  const allText = [title, JSON.stringify(dataJson)].join(' ').toLowerCase()

  // ── Detect flags ─────────────────────────────────
  const flags = []

  HIGH_RISK_KEYWORDS.forEach(kw => {
    if (allText.includes(kw.toLowerCase())) {
      flags.push(`HIGH_RISK_KEYWORD: "${kw}"`)
    }
  })

  MEDIUM_RISK_KEYWORDS.forEach(kw => {
    if (allText.includes(kw.toLowerCase())) {
      flags.push(`MEDIUM_RISK_KEYWORD: "${kw}"`)
    }
  })

  // Track-based flag
  if (track === 'FULL') {
    flags.push('FULL_TRACK: requires complete documentation review')
  }

  // ── Determine risk level ──────────────────────────
  const highCount   = flags.filter(f => f.startsWith('HIGH')).length
  const mediumCount = flags.filter(f => f.startsWith('MEDIUM')).length

  let riskLevel
  if (highCount > 0)      riskLevel = 'HIGH'
  else if (mediumCount > 0) riskLevel = 'MEDIUM'
  else                    riskLevel = 'LOW'

  // ── Compute advisory score (1–10) ────────────────
  const score = Math.max(1, Math.min(10, 8 - highCount * 3 - mediumCount))

  // ── Generate suggestions ──────────────────────────
  const suggestions = buildSuggestions(riskLevel, flags, track)

  // ── Summary ───────────────────────────────────────
  const summary = buildSummary(title, riskLevel, score, flags.length)

  // Simulate realistic async delay
  await new Promise(r => setTimeout(r, 400))

  return {
    riskLevel,
    score,
    flags,
    suggestions,
    summary,
    disclaimer: 'This is an AI-generated advisory analysis. It does not constitute a binding ethical decision and must be reviewed by a human committee member.',
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Builds improvement suggestions based on risk and flags.
 * @param {string}   riskLevel
 * @param {string[]} flags
 * @param {string}   track
 * @returns {string[]}
 */
function buildSuggestions(riskLevel, flags, track) {
  const suggestions = []

  if (riskLevel === 'HIGH') {
    suggestions.push('Provide detailed informed consent procedures for vulnerable populations.')
    suggestions.push('Include a dedicated risk-mitigation section in the protocol.')
    suggestions.push('Ensure an independent safety monitoring plan is in place.')
  }

  if (riskLevel === 'MEDIUM') {
    suggestions.push('Clarify the rationale for the control group design.')
    suggestions.push('Document all invasive procedures and their necessity.')
  }

  if (track === 'EXPEDITED') {
    suggestions.push('Verify eligibility criteria for the expedited track.')
  }

  suggestions.push('Confirm all participant data will be stored in compliance with GDPR / Israeli Privacy Law.')
  suggestions.push('Attach an up-to-date GCP certificate if applicable.')

  return suggestions
}

/**
 * Builds a short narrative summary.
 * @param {string} title
 * @param {string} riskLevel
 * @param {number} score
 * @param {number} flagCount
 * @returns {string}
 */
function buildSummary(title, riskLevel, score, flagCount) {
  const riskMap = { LOW: 'low', MEDIUM: 'moderate', HIGH: 'elevated' }
  const risk    = riskMap[riskLevel] ?? 'unknown'

  return (
    `Preliminary AI analysis of "${title}" indicates a ${risk} ethical risk profile ` +
    `(advisory score: ${score}/10). ` +
    (flagCount > 0
      ? `${flagCount} area${flagCount > 1 ? 's' : ''} of concern were detected and require committee attention. `
      : 'No significant concern keywords were detected. ') +
    'This analysis is advisory only and does not replace human review.'
  )
}
