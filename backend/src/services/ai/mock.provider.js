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

/** Default language for AI narrative fields. */
const DEFAULT_RESPONSE_LANGUAGE = 'he'

// ─────────────────────────────────────────────
// ANALYSIS FUNCTION
// ─────────────────────────────────────────────

/**
 * Analyses a submission's data and returns an advisory result.
 * @param {{ title: string, track: string, dataJson: object, documents?: object[], responseLanguage?: 'he'|'en' }} submissionData
 * @returns {Promise<object>} Advisory result JSON
 */
export async function analyze(submissionData) {
  const {
    title = '',
    track = 'FULL',
    dataJson = {},
    documents = [],
    responseLanguage = DEFAULT_RESPONSE_LANGUAGE,
  } = submissionData
  const language = normalizeLanguage(responseLanguage)

  // Combine all text for keyword scanning
  const documentsText = documents
    .map((doc) => `${doc.name ?? ''} ${doc.mimeType ?? ''}`)
    .join(' ')
  const allText = [title, JSON.stringify(dataJson), documentsText].join(' ').toLowerCase()

  // ── Detect flags ─────────────────────────────────
  const flags = []

  HIGH_RISK_KEYWORDS.forEach(kw => {
    if (allText.includes(kw.toLowerCase())) {
      flags.push(formatFlag('HIGH', kw, language))
    }
  })

  MEDIUM_RISK_KEYWORDS.forEach(kw => {
    if (allText.includes(kw.toLowerCase())) {
      flags.push(formatFlag('MEDIUM', kw, language))
    }
  })

  // Track-based flag
  if (track === 'FULL') {
    flags.push(
      language === 'en'
        ? 'Full track selected: requires complete documentation review.'
        : 'נבחר מסלול מלא: נדרשת בדיקה מלאה של כלל המסמכים.'
    )
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
  const suggestions = buildSuggestions(riskLevel, track, documents, language)

  // ── Summary ───────────────────────────────────────
  const summary = buildSummary(title, riskLevel, score, flags.length, documents.length, language)

  // Simulate realistic async delay
  await new Promise(r => setTimeout(r, 400))

  return {
    riskLevel,
    score,
    responseLanguage: language,
    flags,
    suggestions,
    summary,
    disclaimer: language === 'en'
      ? 'This is an AI-generated advisory analysis. It does not constitute a binding ethical decision and must be reviewed by a human committee member.'
      : 'זהו ניתוח ייעוצי שנוצר על ידי AI. הוא אינו מהווה החלטה אתית מחייבת וחייב להיבדק על ידי חבר ועדה אנושי.',
    inputCoverage: {
      answerFieldCount: Object.keys(dataJson).length,
      documentCount: documents.length,
      documentCoverageMode: 'metadata_only',
    },
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Normalizes language to supported values.
 * @param {string} language
 * @returns {'he' | 'en'}
 */
function normalizeLanguage(language) {
  return language === 'en' ? 'en' : 'he'
}

/**
 * Formats a keyword risk flag in the requested language.
 * @param {'HIGH' | 'MEDIUM'} level
 * @param {string} keyword
 * @param {'he' | 'en'} language
 * @returns {string}
 */
function formatFlag(level, keyword, language) {
  if (language === 'en') {
    return `${level} risk keyword detected: "${keyword}"`
  }
  return `${level === 'HIGH' ? 'מילת מפתח בסיכון גבוה' : 'מילת מפתח בסיכון בינוני'}: "${keyword}"`
}

/**
 * Builds improvement suggestions based on risk and flags.
 * @param {string}   riskLevel
 * @param {string}   track
 * @param {object[]} documents
 * @param {'he' | 'en'} language
 * @returns {string[]}
 */
function buildSuggestions(riskLevel, track, documents, language) {
  const suggestions = []

  if (riskLevel === 'HIGH') {
    suggestions.push(
      ...(language === 'en'
        ? [
          'Provide detailed informed consent procedures for vulnerable populations.',
          'Include a dedicated risk-mitigation section in the protocol.',
          'Ensure an independent safety monitoring plan is in place.',
        ]
        : [
          'יש לפרט נהלי הסכמה מדעת עבור אוכלוסיות פגיעות.',
          'יש להוסיף בפרוטוקול סעיף ייעודי לצמצום סיכונים.',
          'יש לוודא שקיימת תכנית ניטור בטיחות עצמאית.',
        ])
    )
  }

  if (riskLevel === 'MEDIUM') {
    suggestions.push(
      ...(language === 'en'
        ? [
          'Clarify the rationale for the control group design.',
          'Document all invasive procedures and their necessity.',
        ]
        : [
          'יש להבהיר את הרציונל לתכנון קבוצת הביקורת.',
          'יש לתעד את כל ההליכים הפולשניים ואת נחיצותם.',
        ])
    )
  }

  if (track === 'EXPEDITED') {
    suggestions.push(
      language === 'en'
        ? 'Verify eligibility criteria for the expedited track.'
        : 'יש לאמת את קריטריוני ההתאמה למסלול המזורז.'
    )
  }

  if (!documents.length) {
    suggestions.push(
      language === 'en'
        ? 'Attach core protocol documents so the committee can review full context.'
        : 'יש לצרף את מסמכי הליבה של הפרוטוקול כדי לאפשר בחינה מלאה של ההקשר.'
    )
  }

  suggestions.push(
    ...(language === 'en'
      ? [
        'Confirm all participant data will be stored in compliance with GDPR / Israeli Privacy Law.',
        'Attach an up-to-date GCP certificate if applicable.',
      ]
      : [
        'יש לוודא שכל נתוני המשתתפים יישמרו בהתאם ל-GDPR ולחוק הגנת הפרטיות הישראלי.',
        'יש לצרף תעודת GCP עדכנית אם הדבר רלוונטי למחקר.',
      ])
  )

  return suggestions
}

/**
 * Builds a short narrative summary.
 * @param {string} title
 * @param {string} riskLevel
 * @param {number} score
 * @param {number} flagCount
 * @param {number} documentCount
 * @param {'he' | 'en'} language
 * @returns {string}
 */
function buildSummary(title, riskLevel, score, flagCount, documentCount, language) {
  if (language === 'en') {
    const riskMap = { LOW: 'low', MEDIUM: 'moderate', HIGH: 'elevated' }
    const risk = riskMap[riskLevel] ?? 'unknown'
    return (
      `Preliminary AI analysis of "${title}" indicates a ${risk} ethical risk profile ` +
      `(advisory score: ${score}/10). ` +
      (flagCount > 0
        ? `${flagCount} area${flagCount > 1 ? 's' : ''} of concern were detected and require committee attention. `
        : 'No significant concern keywords were detected. ') +
      `The analysis considered metadata from ${documentCount} uploaded document${documentCount === 1 ? '' : 's'}. ` +
      'This analysis is advisory only and does not replace human review.'
    )
  }

  const riskMap = { LOW: 'נמוך', MEDIUM: 'בינוני', HIGH: 'גבוה' }
  const risk = riskMap[riskLevel] ?? 'לא ידוע'
  return (
    `ניתוח AI ראשוני עבור "${title}" מצביע על פרופיל סיכון אתי ${risk} ` +
    `(ציון ייעוצי: ${score}/10). ` +
    (flagCount > 0
      ? `זוהו ${flagCount} תחומי תשומת לב הדורשים בחינה של הוועדה. `
      : 'לא זוהו מילות מפתח המעידות על חשש מהותי. ') +
    `הניתוח התבסס על מטא-דאטה של ${documentCount} מסמכים שהועלו. ` +
    'הניתוח ייעוצי בלבד ואינו מחליף בחינה אנושית.'
  )
}
