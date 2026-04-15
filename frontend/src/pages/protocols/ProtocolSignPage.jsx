/**
 * EthicFlow — Protocol Sign Page (Public)
 * Standalone page — no sidebar, no authentication required.
 * Accessed via email token link: /protocol/sign/:token
 * Design: Option A — centered card, clean, accessible, mobile-first.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

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

export default function ProtocolSignPage() {
  const { t }     = useTranslation()
  const { token } = useParams()

  const [state,     setState]    = useState(STATE.LOADING)
  const [info,      setInfo]     = useState(null)   // { protocolTitle, meetingDate, signerName, signatureStatus, expired }
  const [action,    setAction]   = useState(null)   // 'sign' | 'decline'
  const [submitting,setSubmitting] = useState(false)
  const [errorMsg,  setErrorMsg] = useState(null)

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
    /* Full-screen centred layout — no sidebar */
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-4"
      dir="rtl"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:px-4 focus:py-2 focus:bg-white focus:rounded focus:shadow focus:z-50 focus:text-sm"
      >
        {t('common.skipToMain')}
      </a>

      <main
        id="main-content"
        className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6"
        aria-label={t('protocols.sign.title')}
      >
        {/* Brand header */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--lev-navy)' }}
            aria-hidden="true"
          >
            <span className="text-white text-2xl">📋</span>
          </div>
          <p className="font-bold text-base" style={{ color: 'var(--lev-navy)' }}>
            {t('protocols.sign.title')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{t('protocols.sign.brand')}</p>
        </div>

        {/* ── Loading ── */}
        {state === STATE.LOADING && (
          <div className="text-center text-gray-400 text-sm py-8" role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        )}

        {/* ── Error ── */}
        {state === STATE.ERROR && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 text-center"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-2xl mb-2" aria-hidden="true">⚠️</p>
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        {/* ── Ready to sign ── */}
        {state === STATE.READY && info && (
          <>
            {/* Protocol info card */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 space-y-3 text-right">
              <div>
                <p className="text-xs text-gray-400">{t('protocols.sign.protocolLabel')}</p>
                <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--lev-navy)' }}>
                  {info.protocolTitle}
                </p>
              </div>
              {info.finalizedAt && (
                <div>
                  <p className="text-xs text-gray-400">{t('protocols.sign.dateLabel')}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{fmtDate(info.finalizedAt)}</p>
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400">{t('protocols.sign.signerLabel')}</p>
                <p className="font-bold mt-0.5" style={{ color: 'var(--lev-navy)' }}>
                  {info.signerName}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleAction('sign')}
                disabled={submitting}
                className="w-full text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'var(--lev-navy)', minHeight: '56px' }}
                aria-label={t('protocols.sign.signBtn')}
              >
                <span className="text-lg" aria-hidden="true">✓</span>
                {t('protocols.sign.signBtn')}
              </button>
              <button
                onClick={() => handleAction('decline')}
                disabled={submitting}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-red-600 border-2 border-red-100 hover:bg-red-50 transition-colors disabled:opacity-60"
                style={{ minHeight: '48px' }}
                aria-label={t('protocols.sign.declineBtn')}
              >
                {t('protocols.sign.declineBtn')}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">{t('protocols.sign.expiry')}</p>
          </>
        )}

        {/* ── Confirmed ── */}
        {state === STATE.CONFIRMED && (
          <div
            className="text-center py-4"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-4xl mb-3" aria-hidden="true">
              {action === 'sign' ? '✅' : '📝'}
            </p>
            <p className="font-bold text-base mb-1" style={{ color: 'var(--lev-navy)' }}>
              {action === 'sign'
                ? t('protocols.sign.confirmedSign')
                : t('protocols.sign.confirmedDecline')}
            </p>
            <p className="text-xs text-gray-400 mt-2">{info?.protocolTitle}</p>
          </div>
        )}
      </main>
    </div>
  )
}
