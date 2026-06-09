/**
 * Ethic-Net — Rejection Letter Template Defaults and Validation
 * Shared by PDF renderer and future settings management.
 */

export const REJECTION_TEMPLATE_KEYS = new Set([
  'rejection_template_he',
  'rejection_template_en',
])

export const REJECTION_TEMPLATE_PLACEHOLDERS = [
  '{{applicationId}}',
  '{{researchTitle}}',
  '{{trackLabel}}',
  '{{issueDate}}',
  '{{rejectedDate}}',
  '{{researcherName}}',
  '{{researcherEmail}}',
  '{{institutionName}}',
  '{{rejectionReason}}',
]

/**
 * Builds default rejection template by language.
 * @param {'he'|'en'} lang
 * @returns {{
 *  docTitle: string,
 *  subject: string,
 *  intro: string,
 *  reasonTitle: string,
 *  signatureLabel: string,
 *  legalFooter: string
 * }}
 */
export function getDefaultRejectionTemplate(lang) {
  if (lang === 'en') {
    return {
      docTitle: 'Ethics Committee Decision',
      subject: 'Re: Ethics Committee Decision — Rejected',
      intro:
        'After reviewing your submission, the Ethics Committee has decided not to approve the requested study in its current form.',
      reasonTitle: 'Decision Notes:',
      signatureLabel: 'Chairperson, Ethics Committee',
      legalFooter:
        'This official decision reflects the committee review and remains valid according to committee policy.',
    }
  }

  return {
    docTitle: 'החלטת ועדת אתיקה',
    subject: 'הנדון: החלטת ועדת אתיקה — דחייה',
    intro:
      'לאחר בחינת הבקשה, ועדת האתיקה החליטה שלא לאשר את ביצוע המחקר בנוסחו הנוכחי.',
    reasonTitle: 'נימוקי ההחלטה:',
    signatureLabel: 'יו"ר ועדת האתיקה',
    legalFooter:
      'החלטה רשמית זו משקפת את בדיקת הוועדה ותקפה בהתאם לנהלי ועדת האתיקה.',
  }
}

/**
 * Normalizes unknown template data into safe shape.
 * @param {unknown} raw
 * @param {'he'|'en'} lang
 * @returns {ReturnType<typeof getDefaultRejectionTemplate>}
 */
export function normalizeRejectionTemplate(raw, lang) {
  const defaults = getDefaultRejectionTemplate(lang)
  if (!raw || typeof raw !== 'object') return defaults

  const src = /** @type {Record<string, unknown>} */ (raw)
  return {
    docTitle: typeof src.docTitle === 'string' && src.docTitle.trim() ? src.docTitle.trim() : defaults.docTitle,
    subject: typeof src.subject === 'string' && src.subject.trim() ? src.subject.trim() : defaults.subject,
    intro: typeof src.intro === 'string' && src.intro.trim() ? src.intro.trim() : defaults.intro,
    reasonTitle: typeof src.reasonTitle === 'string' && src.reasonTitle.trim() ? src.reasonTitle.trim() : defaults.reasonTitle,
    signatureLabel:
      typeof src.signatureLabel === 'string' && src.signatureLabel.trim()
        ? src.signatureLabel.trim()
        : defaults.signatureLabel,
    legalFooter:
      typeof src.legalFooter === 'string' && src.legalFooter.trim() ? src.legalFooter.trim() : defaults.legalFooter,
  }
}

