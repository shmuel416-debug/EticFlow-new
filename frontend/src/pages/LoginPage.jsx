/**
 * EthicFlow — Login Page (brand refresh)
 * Split-screen: hero/brand panel + form panel. In Hebrew (RTL) form appears
 * on the LEFT visually and hero on the RIGHT (DOM order: hero → form so that
 * flex-row in RTL flips them to right-then-left).
 * Mobile: stacked, brand hero on top, form below.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, ArrowRight, ArrowLeft, FileCheck2, Timer, Signature } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { buildApiUrl } from '../services/api'
import {
  Button, Input, FormField, LanguageSwitcher,
} from '../components/ui'
import levLogo from '../assets/LOGO.jpg'

/**
 * Microsoft logo SVG (brand colors preserved per MS guidelines).
 * @returns {JSX.Element}
 */
function MicrosoftLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 23 23" fill="none"
      xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00"/>
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF"/>
      <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}

/**
 * Google logo SVG (brand colors preserved per Google guidelines).
 * @returns {JSX.Element}
 */
function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

/**
 * Maps backend SSO error codes to translation keys.
 * @param {string|null} code
 * @returns {string}
 */
function ssoErrorKey(code) {
  const map = {
    sso_email_conflict: 'auth.ssoEmailConflict',
    sso_cancelled: 'auth.ssoCancelled',
    sso_failed: 'auth.ssoFailed',
    sso_no_email: 'auth.ssoFailed',
    sso_state_mismatch: 'auth.ssoFailed',
    account_inactive: 'auth.accountInactive',
    session_expired: 'auth.sessionExpired',
  }
  return map[code] ?? 'auth.ssoFailed'
}

/**
 * Login page — POST /api/auth/login → JWT stored in AuthContext memory.
 * Supports Microsoft + Google SSO via /api/auth/{provider} redirect.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const { t, i18n }  = useTranslation()
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [searchParams] = useSearchParams()
  const isRtl = i18n.dir() === 'rtl'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const initialSsoError = searchParams.get('ssoError')
    || (searchParams.get('error') ? t(ssoErrorKey(searchParams.get('error'))) : '')
  const [error, setError] = useState(initialSsoError)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const code = err.code || 'SERVER_ERROR'
      setError(t(`errors.${code}`, t('auth.login.invalidCredentials')))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: FileCheck2, text: t('auth.login.feature1') },
    { icon: Timer,      text: t('auth.login.feature2') },
    { icon: Signature,  text: t('auth.login.feature3') },
  ]

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div className="min-h-screen flex flex-col md:flex-row">

        {/* ── Hero / brand panel — DOM first, renders on the start side (RIGHT in RTL) ── */}
        <aside
          className="hidden md:flex md:w-[45%] flex-col items-center justify-center p-12 text-white relative overflow-hidden"
          style={{ background: 'var(--gradient-brand)' }}
          aria-label={t('auth.login.systemTitle')}
        >
          {/* decorative accent ring */}
          <span
            aria-hidden="true"
            className="absolute"
            style={{
              width: 520, height: 520,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              top: -180, insetInlineEnd: -180,
            }}
          />
          <span
            aria-hidden="true"
            className="absolute"
            style={{
              width: 320, height: 320,
              borderRadius: '50%',
              border: '1px solid rgba(201,162,39,0.16)',
              bottom: -120, insetInlineStart: -120,
            }}
          />

          <div className="relative text-center mb-10">
            <div className="bg-white rounded-2xl px-6 py-4 inline-flex items-center justify-center mx-auto mb-6 shadow-lg">
              <img src={levLogo} alt="" aria-hidden="true" className="h-14 w-auto" />
            </div>
            <h1 className="text-2xl font-bold leading-tight">{t('auth.login.systemTitle')}</h1>
            <p className="text-sm mt-1.5 opacity-85">{t('common.institution')}</p>
            <div
              className="mt-4 mx-auto"
              aria-hidden="true"
              style={{
                height: 3, width: 64, borderRadius: 999,
                background: 'var(--lev-gold)',
              }}
            />
          </div>

          <ul className="relative space-y-3 w-full max-w-xs" aria-label={t('common.institution')}>
            {features.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-lg)',
                    background: 'var(--lev-gold)',
                    color: 'var(--lev-navy)',
                  }}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" focusable="false" />
                </span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>

          <p className="relative text-xs opacity-60 mt-12">
            &copy; 2026 {t('common.institution')}
          </p>
        </aside>

        {/* ── Form panel — renders visually on the LEFT side in RTL ── */}
        <main
          id="main-content"
          tabIndex="-1"
          className="flex-1 bg-white flex flex-col items-center justify-center p-6 md:p-12"
        >
          {/* Mobile brand header */}
          <div className="md:hidden w-full mb-6">
            <div
              className="rounded-2xl text-white text-center p-6"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <div className="bg-white rounded-xl px-4 py-3 inline-flex items-center justify-center mx-auto mb-3 shadow">
                <img src={levLogo} alt={t('common.institution')} className="h-10 w-auto" />
              </div>
              <p className="text-lg font-bold">{t('auth.login.systemTitle')}</p>
              <p className="text-xs opacity-85">{t('common.institution')}</p>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('auth.login.institutionLabel')}
            </p>
            <h2 className="text-2xl md:text-3xl font-bold mb-1.5" style={{ color: 'var(--lev-navy)' }}>
              {t('auth.login.title')}
            </h2>
            <p className="text-sm mb-7" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.login.subtitle')}
            </p>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                data-testid="login-error"
                className="mb-4 text-sm font-medium"
                style={{
                  background: 'var(--status-danger-50)',
                  color: 'var(--status-danger)',
                  border: '1px solid var(--status-danger)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate aria-label={t('auth.login.title')}>
              <div className="space-y-4">
                <FormField
                  label={t('auth.login.emailLabel')}
                  required
                  render={({ inputId, describedBy, required, invalid }) => (
                    <Input
                      id={inputId}
                      icon={Mail}
                      type="email"
                      data-testid="login-email"
                      autoComplete="email"
                      aria-required={required || undefined}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.login.emailPlaceholder')}
                      dir="ltr"
                      disabled={loading}
                    />
                  )}
                />

                <FormField
                  label={t('auth.login.passwordLabel')}
                  required
                  render={({ inputId, describedBy, required, invalid }) => (
                    <Input
                      id={inputId}
                      icon={Lock}
                      type="password"
                      data-testid="login-password"
                      autoComplete="current-password"
                      aria-required={required || undefined}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.login.passwordPlaceholder')}
                      dir="ltr"
                      disabled={loading}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  fullWidth
                  loading={loading}
                  data-testid="login-submit"
                  rightIcon={
                    isRtl
                      ? <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
                      : <ArrowRight size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
                  }
                >
                  {loading ? t('common.loading') : t('auth.login.submitButton')}
                </Button>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  {t('auth.login.forgotPassword')}
                </Link>
                <LanguageSwitcher />
              </div>

              <div className="flex items-center gap-3 my-6" aria-hidden="true">
                <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t('auth.login.orDivider')}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
              </div>

              <a
                href={buildApiUrl('/auth/microsoft')}
                role="button"
                aria-label={t('auth.loginWithMicrosoft')}
                className="w-full flex items-center justify-center gap-3 transition hover:bg-gray-50"
                style={{
                  minHeight: 48,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: '#fff',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <MicrosoftLogo />
                <span>{t('auth.loginWithMicrosoft')}</span>
              </a>

              <a
                href={buildApiUrl('/auth/google')}
                role="button"
                aria-label={t('auth.loginWithGoogle')}
                className="mt-3 w-full flex items-center justify-center gap-3 transition hover:bg-gray-50"
                style={{
                  minHeight: 48,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  background: '#fff',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-xl)',
                }}
              >
                <GoogleLogo />
                <span>{t('auth.loginWithGoogle')}</span>
              </a>

              <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                <Link
                  to="/accessibility-statement"
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--lev-teal-text)' }}
                >
                  {t('nav.accessibilityStatement')}
                </Link>
              </p>
            </form>
          </div>
        </main>

      </div>
    </>
  )
}
