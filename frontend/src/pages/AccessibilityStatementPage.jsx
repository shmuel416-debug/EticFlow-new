/**
 * EthicFlow — Accessibility Statement (הצהרת נגישות)
 * Mandatory under Israeli IS 5568 / Equal Rights for Persons with Disabilities Act.
 * Public page accessible without authentication; linked from footer/sidebar.
 *
 * References:
 *   - IS 5568 standard
 *   - WCAG 2.2 Level AA
 *   - תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowLeft, Mail, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button, LanguageSwitcher } from '../components/ui'
import levLogo from '../assets/LOGO.jpg'

const LAST_UPDATED = '2026-04-23'
const CONTACT_EMAIL = 'accessibility@jct.ac.il'
const COMMITTEE_EMAIL = 'ethics@jct.ac.il'

/**
 * Mandatory accessibility statement page.
 * @returns {JSX.Element}
 */
export default function AccessibilityStatementPage() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const BackIcon = isRtl ? ArrowLeft : ArrowRight

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-base)' }}>
        {/* Top band */}
        <header
          className="px-6 py-4 text-white"
          style={{ background: 'var(--gradient-brand)' }}
        >
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="bg-white rounded-xl p-1.5 flex-shrink-0 shadow-sm">
              <img src={levLogo} alt="" aria-hidden="true" className="h-9 w-auto" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">EthicFlow</p>
              <p className="text-xs opacity-85 leading-tight">{t('common.institution')}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex="-1"
          className="flex-1 px-4 md:px-6 py-8"
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 44, height: 44,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--lev-gold-50)',
                  color: 'var(--lev-gold-600)',
                }}
              >
                <Shield size={22} strokeWidth={2} aria-hidden="true" focusable="false" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--lev-navy)' }}>
                  הצהרת נגישות
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  עודכנה לאחרונה: {LAST_UPDATED}
                </p>
              </div>
            </div>
            <div className="lev-accent-strip mb-8" aria-hidden="true" />

            <div
              className="bg-white p-6 md:p-8"
              style={{
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Section title="מחויבות לנגישות">
                <p>
                  מערכת <strong>EthicFlow</strong> של ועדת האתיקה למחקר במרכז האקדמי לב
                  מחויבת לספק שירות נגיש לכל המשתמשים, לרבות אנשים עם מוגבלות,
                  בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, תשנ"ח-1998,
                  ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013.
                </p>
              </Section>

              <Section title="תקנים בהם עומדת המערכת">
                <ul className="space-y-2">
                  {[
                    'תקן ישראלי IS 5568 — קווים מנחים לנגישות תוכן באינטרנט',
                    'WCAG 2.2 ברמה AA (Web Content Accessibility Guidelines)',
                    'תמיכה מלאה בקוראי מסך עבריים (NVDA, JAWS, VoiceOver)',
                    'ניווט מלא באמצעות מקלדת בלבד',
                    'תמיכה בהגדלת טקסט עד 200% ללא אובדן תפקודיות',
                    'יחסי ניגודיות צבעים של לפחות 4.5:1 לטקסט רגיל ו-3:1 לטקסט גדול',
                    'תמיכה במצב קריאה מוגברת (prefers-reduced-motion)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        focusable="false"
                        style={{ color: 'var(--status-success)', flexShrink: 0, marginTop: 2 }}
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="התאמות נגישות במערכת">
                <ul className="list-disc ps-5 space-y-1.5" style={{ color: 'var(--text-primary)' }}>
                  <li>ניווט מלא באמצעות מקלדת (Tab, Shift+Tab, Enter, חצים).</li>
                  <li>אינדיקציית מיקוד ברורה (outline) על כל רכיב הניתן להפעלה.</li>
                  <li>תיוגי ARIA מלאים על טפסים, טבלאות, ותפריטים.</li>
                  <li>אזורי landmark סמנטיים (header, nav, main, aside, footer).</li>
                  <li>קישור "דלג לתוכן הראשי" בראש כל עמוד.</li>
                  <li>הודעות שגיאה והצלחה מוכרזות לקוראי מסך (aria-live).</li>
                  <li>מטרות מגע של לפחות 44×44 פיקסלים בכל הכפתורים.</li>
                  <li>תמיכה מלאה בכיוונים עברי (RTL) ואנגלי (LTR).</li>
                </ul>
              </Section>

              <Section title="מגבלות נגישות ידועות">
                <div
                  className="flex items-start gap-3 p-4"
                  style={{
                    background: 'var(--status-warning-50)',
                    border: '1px solid var(--status-warning)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <AlertTriangle
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                    focusable="false"
                    style={{ color: 'var(--status-warning)', flexShrink: 0, marginTop: 2 }}
                  />
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <p className="font-semibold mb-1" style={{ color: 'var(--status-warning)' }}>
                      תחומים בטיפול
                    </p>
                    <ul className="list-disc ps-5 space-y-1">
                      <li>
                        קבצים מצורפים בפורמט PDF שהועלו על ידי משתמשים עשויים להיות
                        לא-נגישים; אנו ממליצים להעלות מסמכים נגישים (PDF Tagged).
                      </li>
                      <li>
                        מסכי Builder לבניית טפסים מיועדים להפעלה על ידי צוות מזכירות
                        באמצעות עכבר; קיימות חלופות זמינות עבור משתמשים עם מוגבלות.
                      </li>
                    </ul>
                  </div>
                </div>
              </Section>

              <Section title="פנייה לרכז הנגישות">
                <p>
                  נתקלתם בבעיית נגישות? אנא פנו אלינו ואנו נטפל בפנייתכם במהירות:
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <ContactRow
                    label="רכז נגישות"
                    value={CONTACT_EMAIL}
                    href={`mailto:${CONTACT_EMAIL}`}
                  />
                  <ContactRow
                    label="ועדת האתיקה למחקר"
                    value={COMMITTEE_EMAIL}
                    href={`mailto:${COMMITTEE_EMAIL}`}
                  />
                </div>
                <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                  זמן מענה ממוצע: 5 ימי עסקים.
                </p>
              </Section>

              <Section title="הערכת נגישות">
                <p>
                  הצהרה זו נבדקה באמצעות כלי הבדיקה האוטומטיים <strong>axe-core</strong>{' '}
                  ו-<strong>Lighthouse</strong>, ובדיקה ידנית עם קוראי מסך NVDA ו-VoiceOver.
                  המערכת נתמכת בדפדפנים: Chrome, Edge, Firefox, Safari (גרסאות 2023 ומעלה).
                </p>
              </Section>

              <div className="pt-6 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Link
                  to="/login"
                  className="text-sm font-semibold hover:underline inline-flex items-center gap-1.5"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  <BackIcon size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
                  חזרה לדף הכניסה
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="ms-auto"
                  aria-label={`שלח אימייל לרכז הנגישות בכתובת ${CONTACT_EMAIL}`}
                >
                  <Button variant="gold" size="md" leftIcon={<Mail size={16} strokeWidth={2} aria-hidden="true" focusable="false" />}>
                    פנייה לרכז נגישות
                  </Button>
                </a>
              </div>
            </div>

            <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
              &copy; 2026 {t('common.institution')} — מערכת EthicFlow
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

/**
 * Section heading + body wrapper.
 */
function Section({ title, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--lev-navy)' }}>
        {title}
      </h2>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-primary)' }}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * Contact-row helper.
 */
function ContactRow({ label, value, href }) {
  return (
    <div className="flex items-center gap-2">
      <Mail size={14} strokeWidth={1.75} aria-hidden="true" focusable="false" style={{ color: 'var(--text-muted)' }} />
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <a
        href={href}
        className="font-semibold hover:underline"
        style={{ color: 'var(--lev-teal-text)' }}
      >
        {value}
      </a>
    </div>
  )
}
