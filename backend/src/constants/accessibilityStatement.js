/**
 * EthicFlow — Accessibility Statement defaults and schema.
 * Provides a single source of truth for public fallback content and validation.
 */

import { z } from 'zod'

export const ACCESSIBILITY_STATEMENT_KEY = 'accessibility_statement'

const SECTION_VARIANTS = ['default', 'warning']

const sectionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(20000),
  variant: z.enum(SECTION_VARIANTS),
})

const localizedStatementSchema = z.object({
  title: z.string().min(1).max(120),
  sections: z.array(sectionSchema).min(1).max(20),
})

export const accessibilityStatementSchema = z.object({
  lastUpdated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  contactEmail: z.string().email(),
  committeeEmail: z.string().email(),
  responseTimeBusinessDays: z.number().int().min(1).max(60),
  he: localizedStatementSchema,
  en: localizedStatementSchema,
})

/**
 * Returns default bilingual accessibility statement content.
 * @returns {z.infer<typeof accessibilityStatementSchema>}
 */
export function getDefaultAccessibilityStatement() {
  return {
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
            '- A \"Skip to main content\" link at the top of each page.',
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
}
