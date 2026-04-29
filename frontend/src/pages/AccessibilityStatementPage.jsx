/**
 * EthicFlow — Accessibility Statement (הצהרת נגישות)
 * Public page with DB-backed bilingual markdown content and safe fallback.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, ArrowLeft, Mail, Shield, AlertTriangle } from 'lucide-react'
import { Button, LanguageSwitcher, Skeleton } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import levLogo from '../assets/LOGO.jpg'
import {
  getDefaultAccessibilityStatement,
  getPublicStatement,
} from '../services/accessibilityStatement.api'

/**
 * Accessibility statement public page.
 * @returns {JSX.Element}
 */
export default function AccessibilityStatementPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [statement, setStatement] = useState(getDefaultAccessibilityStatement())
  const [loading, setLoading] = useState(true)

  const backTo = typeof location.state?.from === 'string'
    ? location.state.from
    : (user ? '/dashboard' : '/login')
  const backLabel = user ? t('common.back') : t('accessibilityStatementPage.backToLogin')
  const isRtl = i18n.dir() === 'rtl'
  const BackIcon = isRtl ? ArrowLeft : ArrowRight
  const lang = i18n.language === 'en' ? 'en' : 'he'
  const localized = useMemo(() => statement[lang], [lang, statement])

  useEffect(() => {
    let cancelled = false

    /**
     * Loads the statement and falls back to defaults on failure.
     * @returns {Promise<void>}
     */
    async function loadStatement() {
      setLoading(true)
      try {
        const data = await getPublicStatement()
        if (!cancelled) setStatement(data)
      } catch {
        if (!cancelled) setStatement(getDefaultAccessibilityStatement())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStatement()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-base)' }}>
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
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--lev-gold-50)',
                  color: 'var(--lev-gold-600)',
                }}
              >
                <Shield size={22} strokeWidth={2} aria-hidden="true" focusable="false" />
              </span>
              <div>
                {loading ? (
                  <Skeleton className="h-8 w-48" />
                ) : (
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--lev-navy)' }}>
                    {localized.title}
                  </h1>
                )}
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {t('accessibilityStatementPage.lastUpdated', { date: statement.lastUpdated })}
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
              {loading && <StatementSkeleton />}

              {!loading && localized.sections.map((section) => (
                <Section key={section.id} title={section.title}>
                  {section.variant === 'warning' ? (
                    <WarningBox body={section.body} dir={i18n.dir()} />
                  ) : (
                    <MarkdownBlock body={section.body} dir={i18n.dir()} />
                  )}
                </Section>
              ))}

              {!loading && (
                <div className="pt-6 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <Link
                    to={backTo}
                    className="text-sm font-semibold hover:underline inline-flex items-center gap-1.5"
                    style={{ color: 'var(--lev-teal-text)' }}
                  >
                    <BackIcon size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
                    {backLabel}
                  </Link>
                  <a
                    href={`mailto:${statement.contactEmail}`}
                    className="ms-auto"
                    aria-label={t('accessibilityStatementPage.contactAriaLabel', { email: statement.contactEmail })}
                  >
                    <Button variant="gold" size="md" leftIcon={<Mail size={16} strokeWidth={2} aria-hidden="true" focusable="false" />}>
                      {t('accessibilityStatementPage.contactButton')}
                    </Button>
                  </a>
                </div>
              )}
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
 * Loading skeleton for statement sections.
 * @returns {JSX.Element}
 */
function StatementSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-6 w-52" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-6 w-44 mt-2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/**
 * Section heading + body wrapper.
 * @param {{ title: string, children: import('react').ReactNode }} props
 * @returns {JSX.Element}
 */
function Section({ title, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--lev-navy)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
    </section>
  )
}

/**
 * Renders markdown body with RTL/LTR direction.
 * @param {{ body: string, dir: string }} props
 * @returns {JSX.Element}
 */
function MarkdownBlock({ body, dir }) {
  return (
    <div className="prose prose-sm max-w-none" dir={dir}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Warning section renderer for known limitations.
 * @param {{ body: string, dir: string }} props
 * @returns {JSX.Element}
 */
function WarningBox({ body, dir }) {
  return (
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
      <div className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
        <MarkdownBlock body={body} dir={dir} />
      </div>
    </div>
  )
}
