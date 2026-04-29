/**
 * EthicFlow — Accessibility statement API service.
 * Handles public fetch + admin fetch/save + client-side normalization fallback.
 */

import api from './api'

export const ACCESSIBILITY_STATEMENT_KEY = 'accessibility_statement'

const MAX_SECTIONS = 20
const MAX_BODY_LENGTH = 20000
const SECTION_VARIANTS = new Set(['default', 'warning'])

/**
 * Returns a deep-cloned default accessibility statement object.
 * @returns {object}
 */
export function getDefaultAccessibilityStatement() {
  return JSON.parse(JSON.stringify(DEFAULT_ACCESSIBILITY_STATEMENT))
}

/**
 * Normalizes a markdown section object.
 * @param {unknown} raw
 * @param {number} index
 * @returns {{id: string, title: string, body: string, variant: 'default'|'warning'}}
 */
function normalizeSection(raw, index) {
  const id = String(raw?.id || `section_${index + 1}`).slice(0, 80)
  const title = String(raw?.title || '').trim()
  const body = String(raw?.body || '').slice(0, MAX_BODY_LENGTH)
  const variant = SECTION_VARIANTS.has(raw?.variant) ? raw.variant : 'default'
  return {
    id: id || `section_${index + 1}`,
    title,
    body,
    variant,
  }
}

/**
 * Normalizes a localized statement block.
 * @param {unknown} raw
 * @param {'he'|'en'} lang
 * @returns {{title: string, sections: Array<{id: string, title: string, body: string, variant: 'default'|'warning'}>}}
 */
function normalizeLocale(raw, lang) {
  const fallback = DEFAULT_ACCESSIBILITY_STATEMENT[lang]
  const title = String(raw?.title || fallback.title).slice(0, 120)
  const sectionsInput = Array.isArray(raw?.sections) ? raw.sections : fallback.sections
  const sections = sectionsInput
    .slice(0, MAX_SECTIONS)
    .map((section, index) => normalizeSection(section, index))
    .filter((section) => section.title && section.body)

  return {
    title: title || fallback.title,
    sections: sections.length > 0 ? sections : fallback.sections,
  }
}

/**
 * Parses and validates statement payload from API/settings.
 * @param {unknown} raw
 * @returns {object}
 */
export function normalizeAccessibilityStatement(raw) {
  const fallback = getDefaultAccessibilityStatement()
  if (!raw || typeof raw !== 'object') return fallback
  const result = {
    lastUpdated: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.lastUpdated || ''))
      ? String(raw.lastUpdated)
      : fallback.lastUpdated,
    contactEmail: String(raw.contactEmail || fallback.contactEmail),
    committeeEmail: String(raw.committeeEmail || fallback.committeeEmail),
    responseTimeBusinessDays: Number.isInteger(raw.responseTimeBusinessDays)
      ? Math.min(Math.max(raw.responseTimeBusinessDays, 1), 60)
      : fallback.responseTimeBusinessDays,
    he: normalizeLocale(raw.he, 'he'),
    en: normalizeLocale(raw.en, 'en'),
  }
  return result
}

/**
 * Fetches public statement payload.
 * @returns {Promise<object>}
 */
export async function getPublicStatement() {
  const res = await api.get('/settings/public/accessibility-statement')
  return normalizeAccessibilityStatement(res?.data?.data)
}

/**
 * Fetches admin statement from /settings list.
 * @returns {Promise<object>}
 */
export async function getAdminStatement() {
  const res = await api.get('/settings')
  const settings = Array.isArray(res?.data?.data) ? res.data.data : []
  const row = settings.find((item) => item?.key === ACCESSIBILITY_STATEMENT_KEY)
  if (!row?.value) return getDefaultAccessibilityStatement()
  try {
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
    return normalizeAccessibilityStatement(parsed)
  } catch {
    return getDefaultAccessibilityStatement()
  }
}

/**
 * Persists the full statement payload.
 * @param {object} value
 * @returns {Promise<object>}
 */
export async function saveStatement(value) {
  const normalized = normalizeAccessibilityStatement(value)
  const res = await api.put(`/settings/${ACCESSIBILITY_STATEMENT_KEY}`, { value: normalized })
  return res?.data?.data
}

const DEFAULT_ACCESSIBILITY_STATEMENT = {
  lastUpdated: '2026-04-23',
  contactEmail: 'accessibility@jct.ac.il',
  committeeEmail: 'ethics@jct.ac.il',
  responseTimeBusinessDays: 5,
  he: {
    title: 'הצהרת נגישות',
    sections: [
      {
        id: 'commitment',
        title: 'מחויבות לנגישות',
        variant: 'default',
        body: [
          'מערכת **EthicFlow** של ועדת האתיקה למחקר במרכז האקדמי לב מחויבת לספק שירות נגיש לכל המשתמשים, לרבות אנשים עם מוגבלות.',
          '',
          'המערכת פועלת בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח-1998,',
          'ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013.',
        ].join('\n'),
      },
      {
        id: 'standards',
        title: 'תקנים בהם עומדת המערכת',
        variant: 'default',
        body: [
          '- תקן ישראלי IS 5568 — קווים מנחים לנגישות תוכן באינטרנט',
          '- WCAG 2.2 ברמה AA (Web Content Accessibility Guidelines)',
          '- תמיכה מלאה בקוראי מסך עבריים (NVDA, JAWS, VoiceOver)',
          '- ניווט מלא באמצעות מקלדת בלבד',
          '- תמיכה בהגדלת טקסט עד 200% ללא אובדן תפקודיות',
          '- יחסי ניגודיות צבעים של לפחות 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול',
          '- תמיכה במצב קריאה מוגברת (prefers-reduced-motion)',
        ].join('\n'),
      },
      {
        id: 'accommodations',
        title: 'התאמות נגישות במערכת',
        variant: 'default',
        body: [
          '- ניווט מלא באמצעות מקלדת (Tab, Shift+Tab, Enter, חצים).',
          '- אינדיקציית מיקוד ברורה (outline) על כל רכיב הניתן להפעלה.',
          '- תיוגי ARIA מלאים על טפסים, טבלאות ותפריטים.',
          '- אזורי landmark סמנטיים (header, nav, main, aside, footer).',
          '- קישור "דלג לתוכן הראשי" בראש כל עמוד.',
          '- הודעות שגיאה והצלחה מוכרזות לקוראי מסך (aria-live).',
          '- מטרות מגע של לפחות 44x44 פיקסלים בכל הכפתורים.',
          '- תמיכה מלאה בכיוונים עברי (RTL) ואנגלי (LTR).',
        ].join('\n'),
      },
      {
        id: 'limitations',
        title: 'מגבלות נגישות ידועות',
        variant: 'warning',
        body: [
          '**תחומים בטיפול**',
          '',
          '- קבצים מצורפים בפורמט PDF שהועלו על ידי משתמשים עשויים להיות לא-נגישים; אנו ממליצים להעלות מסמכים נגישים (PDF Tagged).',
          '- מסכי Builder לבניית טפסים מיועדים להפעלה על ידי צוות מזכירות באמצעות עכבר; קיימות חלופות זמינות עבור משתמשים עם מוגבלות.',
        ].join('\n'),
      },
      {
        id: 'contact',
        title: 'פנייה לרכז הנגישות',
        variant: 'default',
        body: [
          'נתקלתם בבעיית נגישות? אנא פנו אלינו ואנו נטפל בפנייתכם במהירות.',
          '',
          '- רכז נגישות: accessibility@jct.ac.il',
          '- ועדת האתיקה למחקר: ethics@jct.ac.il',
        ].join('\n'),
      },
      {
        id: 'evaluation',
        title: 'הערכת נגישות',
        variant: 'default',
        body: [
          'הצהרה זו נבדקה באמצעות כלי הבדיקה האוטומטיים **axe-core** ו-**Lighthouse**,',
          'ובדיקה ידנית עם קוראי מסך NVDA ו-VoiceOver.',
          '',
          'המערכת נתמכת בדפדפנים: Chrome, Edge, Firefox, Safari (גרסאות 2023 ומעלה).',
        ].join('\n'),
      },
    ],
  },
  en: {
    title: 'Accessibility Statement',
    sections: [
      {
        id: 'commitment',
        title: 'Commitment to Accessibility',
        variant: 'default',
        body: [
          '**EthicFlow**, used by the Lev Academic Center Ethics Committee, is committed to providing accessible service to all users, including people with disabilities.',
          '',
          'The system is maintained in accordance with Israeli accessibility law and the Equal Rights for Persons with Disabilities regulations.',
        ].join('\n'),
      },
      {
        id: 'standards',
        title: 'Standards Followed',
        variant: 'default',
        body: [
          '- Israeli Standard IS 5568 for web content accessibility',
          '- WCAG 2.2 Level AA (Web Content Accessibility Guidelines)',
          '- Full support for screen readers (NVDA, JAWS, VoiceOver)',
          '- Full keyboard-only navigation',
          '- Text zoom support up to 200% without loss of functionality',
          '- Color contrast ratios of at least 4.5:1 for normal text and 3:1 for large text',
          '- Reduced-motion friendly behavior (prefers-reduced-motion)',
        ].join('\n'),
      },
      {
        id: 'accommodations',
        title: 'Accessibility Features in the System',
        variant: 'default',
        body: [
          '- Full keyboard navigation (Tab, Shift+Tab, Enter, Arrow keys).',
          '- Visible focus indicators on all interactive elements.',
          '- ARIA labels for forms, tables, and menus.',
          '- Semantic landmarks (header, nav, main, aside, footer).',
          '- A "Skip to main content" link at the top of each page.',
          '- Error and success announcements for screen readers (aria-live).',
          '- Touch targets of at least 44x44 pixels on actionable controls.',
          '- Full support for both RTL Hebrew and LTR English layouts.',
        ].join('\n'),
      },
      {
        id: 'limitations',
        title: 'Known Accessibility Limitations',
        variant: 'warning',
        body: [
          '**Areas in progress**',
          '',
          '- User-uploaded PDF attachments may not always be accessible; we recommend uploading tagged accessible PDFs whenever possible.',
          '- Some internal form-builder screens are primarily optimized for mouse-based secretary workflows; accessible alternatives are available on request.',
        ].join('\n'),
      },
      {
        id: 'contact',
        title: 'Contact the Accessibility Coordinator',
        variant: 'default',
        body: [
          'If you encounter an accessibility issue, please contact us and we will handle your request promptly.',
          '',
          '- Accessibility Coordinator: accessibility@jct.ac.il',
          '- Ethics Committee: ethics@jct.ac.il',
        ].join('\n'),
      },
      {
        id: 'evaluation',
        title: 'Accessibility Evaluation',
        variant: 'default',
        body: [
          'This statement is reviewed using automated tools such as **axe-core** and **Lighthouse**,',
          'as well as manual testing with NVDA and VoiceOver screen readers.',
          '',
          'The system supports current versions of Chrome, Edge, Firefox, and Safari.',
        ].join('\n'),
      },
    ],
  },
}
