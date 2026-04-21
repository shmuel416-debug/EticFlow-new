/**
 * EthicFlow — Approval Letter Template Defaults and Validation
 * Shared by settings controller, PDF renderer, and seed data.
 */

const DEFAULT_CONDITIONS_HE = [
  'המחקר יתנהל בהתאם לפרוטוקול שהוגש ואושר.',
  'כל שינוי מהותי בפרוטוקול יוגש לאישור ועדה מחדש.',
  'יש לקבל הסכמה מדעת של כל משתתף לפני תחילת המחקר.',
  'הממצאים יועברו לוועדה בתום המחקר.',
]

const DEFAULT_CONDITIONS_EN = [
  'The research shall be conducted in accordance with the approved protocol.',
  'Any substantive protocol amendments require re-submission for committee approval.',
  'Informed consent must be obtained from each participant prior to commencement.',
  'Research findings shall be submitted to the committee upon completion.',
]

export const APPROVAL_TEMPLATE_KEYS = new Set([
  'approval_template_he',
  'approval_template_en',
])

export const APPROVAL_TEMPLATE_HISTORY_KEYS = new Set([
  'approval_template_history_he',
  'approval_template_history_en',
])

/**
 * Resolves template history key by language.
 * @param {'he'|'en'} lang
 * @returns {string}
 */
export function getApprovalTemplateHistoryKey(lang) {
  return lang === 'en' ? 'approval_template_history_en' : 'approval_template_history_he'
}

export const APPROVAL_TEMPLATE_PLACEHOLDERS = [
  '{{applicationId}}',
  '{{researchTitle}}',
  '{{trackLabel}}',
  '{{issueDate}}',
  '{{approvedDate}}',
  '{{validUntil}}',
  '{{researcherName}}',
  '{{researcherEmail}}',
  '{{institutionName}}',
]

/**
 * Builds default approval template content by language.
 * @param {'he'|'en'} lang
 * @returns {{
 *  docTitle: string,
 *  subject: string,
 *  intro: string,
 *  conditionsTitle: string,
 *  conditions: string[],
 *  signatureLabel: string,
 *  legalFooter: string
 * }}
 */
export function getDefaultApprovalTemplate(lang) {
  if (lang === 'en') {
    return {
      docTitle: 'Ethics Committee Approval',
      subject: 'Re: Ethics Committee Research Approval',
      intro:
        'The Ethics Committee has reviewed your application and is pleased to approve the conduct of the research described below, subject to the conditions stated in this decision.',
      conditionsTitle: 'Approval Conditions:',
      conditions: DEFAULT_CONDITIONS_EN,
      signatureLabel: 'Chairperson, Ethics Committee',
      legalFooter:
        'This official document is valid subject to ethics committee policies and authorized signatures.',
    }
  }

  return {
    docTitle: 'אישור ועדת אתיקה',
    subject: 'הנדון: אישור ועדת אתיקה למחקר',
    intro:
      'ועדת האתיקה בדקה את בקשתך ושמחה לאשר את ביצוע המחקר המפורט להלן, בכפוף לתנאים הנקובים בהחלטה.',
    conditionsTitle: 'תנאי האישור:',
    conditions: DEFAULT_CONDITIONS_HE,
    signatureLabel: 'יו"ר ועדת האתיקה',
    legalFooter:
      'מסמך רשמי זה תקף בכפוף לנהלי ועדת האתיקה וחתימות מורשות.',
  }
}

/**
 * Normalizes unknown template data into safe shape.
 * @param {unknown} raw
 * @param {'he'|'en'} lang
 * @returns {ReturnType<typeof getDefaultApprovalTemplate>}
 */
export function normalizeApprovalTemplate(raw, lang) {
  const defaults = getDefaultApprovalTemplate(lang)
  if (!raw || typeof raw !== 'object') return defaults

  const src = /** @type {Record<string, unknown>} */ (raw)
  const conditions = Array.isArray(src.conditions)
    ? src.conditions
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, 8)
    : defaults.conditions

  return {
    docTitle: typeof src.docTitle === 'string' && src.docTitle.trim() ? src.docTitle.trim() : defaults.docTitle,
    subject: typeof src.subject === 'string' && src.subject.trim() ? src.subject.trim() : defaults.subject,
    intro: typeof src.intro === 'string' && src.intro.trim() ? src.intro.trim() : defaults.intro,
    conditionsTitle:
      typeof src.conditionsTitle === 'string' && src.conditionsTitle.trim()
        ? src.conditionsTitle.trim()
        : defaults.conditionsTitle,
    conditions: conditions.length > 0 ? conditions : defaults.conditions,
    signatureLabel:
      typeof src.signatureLabel === 'string' && src.signatureLabel.trim()
        ? src.signatureLabel.trim()
        : defaults.signatureLabel,
    legalFooter:
      typeof src.legalFooter === 'string' && src.legalFooter.trim() ? src.legalFooter.trim() : defaults.legalFooter,
  }
}

/**
 * Validates editable template object and returns normalized data.
 * Throws a regular error message; caller maps to AppError.
 * @param {unknown} raw
 * @param {'he'|'en'} lang
 * @returns {ReturnType<typeof getDefaultApprovalTemplate>}
 */
export function validateApprovalTemplatePayload(raw, lang) {
  const normalized = normalizeApprovalTemplate(raw, lang)
  const maxLen = {
    docTitle: 140,
    subject: 240,
    intro: 2200,
    conditionsTitle: 140,
    signatureLabel: 180,
    legalFooter: 900,
    condition: 500,
  }

  if (normalized.docTitle.length > maxLen.docTitle) throw new Error('Template title is too long')
  if (normalized.subject.length > maxLen.subject) throw new Error('Template subject is too long')
  if (normalized.intro.length > maxLen.intro) throw new Error('Template intro is too long')
  if (normalized.conditionsTitle.length > maxLen.conditionsTitle) throw new Error('Template conditions title is too long')
  if (normalized.signatureLabel.length > maxLen.signatureLabel) throw new Error('Template signature label is too long')
  if (normalized.legalFooter.length > maxLen.legalFooter) throw new Error('Template legal footer is too long')
  if (normalized.conditions.length < 1) throw new Error('Template must include at least one condition')
  if (normalized.conditions.length > 8) throw new Error('Template has too many conditions')
  for (const line of normalized.conditions) {
    if (line.length > maxLen.condition) throw new Error('Template condition line is too long')
  }

  const placeholderRegex = /\{\{[a-zA-Z0-9_]+\}\}/g
  const allowed = new Set(APPROVAL_TEMPLATE_PLACEHOLDERS)
  const fieldsToScan = [
    normalized.docTitle,
    normalized.subject,
    normalized.intro,
    normalized.conditionsTitle,
    normalized.signatureLabel,
    normalized.legalFooter,
    ...normalized.conditions,
  ]
  for (const text of fieldsToScan) {
    const matches = text.match(placeholderRegex) || []
    for (const token of matches) {
      if (!allowed.has(token)) throw new Error(`Unsupported placeholder: ${token}`)
    }
  }

  return normalized
}

