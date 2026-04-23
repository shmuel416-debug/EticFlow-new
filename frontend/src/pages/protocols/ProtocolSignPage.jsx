/**
 * EthicFlow — Protocol Sign Page (Public)
 * Standalone page — no sidebar, no authentication required.
 * Accessed via email token link: /protocol/sign/:token
 *
 * Visual: centered Card + brand gradient accent strip (same shell as
 *         ForgotPasswordPage); strong a11y for external signers.
 * Behaviour unchanged — token fetch, sign, decline flow preserved.
 * IS 5568 / WCAG 2.2 AA compliant.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Signature,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  FileText,
} from 'lucide-react'
import api from '../../services/api'
import {
  Button,
  Spinner,
  AccessibleIcon,
} from '../../components/ui'
import levLogo from '../../assets/LOGO.jpg'

/**
 * Formats an ISO date as dd/MM/yyyy (he-IL).
 * @param {string} iso
 * @returns {string}
 */
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Page states */
const STATE = {
  LOADING:   'LOADING',
  READY:     'READY',
  CONFIRMED: 'CONFIRMED',
  ERROR:     'ERROR',
}

/**
 * Public protocol signing page — consumed from email token link.
 * @returns {JSX.Element}
 */
export default function ProtocolSignPage() {
  const { t }     = useTranslation()
  const { token } = useParams()

  const [state,      setState]       = useState(STATE.LOADING)
  const [info,       setInfo]        = useState(null)
  const [action,     setAction]      = useState(null)   // 'sign' | 'decline'
  const [submitting, setSubmitting]  = useState(false)
  const [errorMsg,   setErrorMsg]    = useState(null)

  // ── Fetch token info ─────────────────────────

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await api.get(`/protocol/sign/${token}`)
        const d   = res.data.data
        setInfo(d)

        if (d.signatureStatus !== 'PENDING') {
          setErrorMsg(t('protocols.sign.alreadyUsed'))
          setState(STATE.ERROR)
        } else if (d.expired) {
          setErrorMsg(t('protocols.sign.expired'))
          setState(STATE.ERROR)
        } else {
          setState(STATE.READY)
        }
      } catch (err) {
        if (err.status === 404) {
          setErrorMsg(t('protocols.sign.notFound'))
        } else if (err.code === 'TOKEN_EXPIRED') {
          setErrorMsg(t('protocols.sign.expired'))
        } else {
          setErrorMsg(t('protocols.sign.alreadyUsed'))
        }
        setState(STATE.ERROR)
      }
    }
    fetchInfo()
  }, [token, t])

  // ── Submit sign / decline ────────────────────

  async function handleAction(chosen) {
    setSubmitting(true)
    try {
      await api.post(`/protocol/sign/${token}`, { action: chosen })
      setAction(chosen)
      setState(STATE.CONFIRMED)
    } catch (err) {
      if (err.code === 'ALREADY_SIGNED') {
        setErrorMsg(t('protocols.sign.alreadyUsed'))
      } else if (err.code === 'TOKEN_EXPIRED') {
        setErrorMsg(t('protocols.sign.expired'))
      } else {
        setErrorMsg(t('errors.SERVER_ERROR'))
      }
      setState(STATE.ERROR)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>

      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--surface-base)' }}
        dir="rtl"
      >
        <main
          id="main-content"
          tabIndex="-1"
          className="w-full max-w-md bg-white p-8 relative overflow-hidden"
          style={{
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
          }}
          aria-label={t('protocols.sign.title')}
        >
          {/* Brand accent strip */}
          <div
            className="absolute top-0 inset-x-0"
            aria-hidden="true"
            style={{ height: 4, background: 'var(--gradient-brand-flat)' }}
          />

          {/* Brand header */}
          <div className="flex items-center gap-3 mb-6 mt-2">
            <img src={levLogo} alt={t('common.institution')} className="h-10 w-auto" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--lev-navy)' }}>
                {t('common.appName')}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {t('protocols.sign.brand')}
              </p>
            </div>
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--lev-navy)' }}>
            {t('protocols.sign.title')}
          </h1>

          {/* ── Loading ── */}
          {state === STATE.LOADING && (
            <div
              className="flex flex-col items-center gap-3 py-10"
              role="status"
              aria-live="polite"
            >
              <Spinner size={28} label={t('common.loading')} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('common.loading')}
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {state === STATE.ERROR && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-col items-center gap-3 text-sm mt-4"
              style={{
                background: 'var(--status-danger-50)',
                color: 'var(--status-danger)',
                border: '1px solid var(--status-danger)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 16px',
              }}
            >
              <AlertTriangle size={26} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="font-semibold text-center">{errorMsg}</span>
            </div>
          )}

          {/* ── Ready to sign ── */}
          {state === STATE.READY && info && (
            <>
              {/* Protocol details card */}
              <section
                className="mt-4 mb-6 p-4 space-y-3"
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                }}
                aria-label={t('protocols.sign.protocolLabel')}
              >
                <div className="flex items-start gap-2">
                  <AccessibleIcon icon={FileText} size={18} decorative />
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t('protocols.sign.protocolLabel')}
                    </p>
                    <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--lev-navy)' }}>
                      {info.protocolTitle}
                    </p>
                  </div>
                </div>
                {info.finalizedAt && (
                  <div className="flex items-start gap-2">
                    <AccessibleIcon icon={ClipboardList} size={18} decorative />
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('protocols.sign.dateLabel')}
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>
                        {fmtDate(info.finalizedAt)}
                      </p>
                    </div>
                  </div>
                )}
                <div
                  className="pt-3"
                  style={{ borderTop: '1px solid var(--border-default)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('protocols.sign.signerLabel')}
                  </p>
                  <p className="font-bold mt-0.5" style={{ color: 'var(--lev-navy)' }}>
                    {info.signerName}
                  </p>
                </div>
              </section>

              {/* Action buttons */}
              <div className="space-y-3">
                <Button
                  variant="gold"
                  size="lg"
                  fullWidth
                  onClick={() => handleAction('sign')}
                  disabled={submitting}
                  loading={submitting && action === 'sign'}
                  leftIcon={<AccessibleIcon icon={Signature} size={18} decorative />}
                  aria-label={t('protocols.sign.signBtn')}
                >
                  {t('protocols.sign.signBtn')}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={() => handleAction('decline')}
                  disabled={submitting}
                  loading={submitting && action === 'decline'}
                  leftIcon={<AccessibleIcon icon={XCircle} size={18} decorative />}
                  aria-label={t('protocols.sign.declineBtn')}
                >
                  {t('protocols.sign.declineBtn')}
                </Button>
              </div>

              <p
                className="text-center text-xs mt-4"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('protocols.sign.expiry')}
              </p>
            </>
          )}

          {/* ── Confirmed ── */}
          {state === STATE.CONFIRMED && (
            <div
              className="text-center py-6"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                className="inline-flex items-center justify-center mx-auto mb-3"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-full)',
                  background: action === 'sign' ? 'var(--status-success-50)' : 'var(--status-warning-50)',
                  color: action === 'sign' ? 'var(--status-success)' : 'var(--status-warning)',
                }}
              >
                <AccessibleIcon
                  icon={action === 'sign' ? CheckCircle2 : ClipboardList}
                  size={28}
                  decorative
                />
              </div>
              <p className="font-bold text-base mb-1" style={{ color: 'var(--lev-navy)' }}>
                {action === 'sign'
                  ? t('protocols.sign.confirmedSign')
                  : t('protocols.sign.confirmedDecline')}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {info?.protocolTitle}
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
