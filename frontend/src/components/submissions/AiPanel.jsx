/**
 * EthicFlow — AiPanel Component
 * Advisory AI analysis panel for a submission.
 * Shows: risk level, score, flags, suggestions, summary, disclaimer.
 * Allows triggering a new analysis via the API.
 *
 * @param {string}  submissionId - Submission UUID
 * @param {boolean} [canRun]     - Whether the current user may trigger a new analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

/** Risk level color config. */
const RISK_CONFIG = {
  LOW:    { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', label: 'ai.risk.LOW' },
  MEDIUM: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', label: 'ai.risk.MEDIUM' },
  HIGH:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', label: 'ai.risk.HIGH' },
}

/**
 * Score bar — shows advisory score 1–10.
 * @param {{ score: number }} props
 */
function ScoreBar({ score }) {
  const { t }   = useTranslation()
  const pct     = (score / 10) * 100
  const color   = score >= 7 ? '#16a34a' : score >= 4 ? '#d97706' : '#dc2626'

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{t('ai.score')}</span>
        <span className="font-bold" style={{ color }}>{score}/10</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar"
        aria-valuenow={score} aria-valuemin={1} aria-valuemax={10}
        aria-label={t('ai.scoreLabel', { score })}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

/**
 * AiPanel — advisory analysis results card.
 */
export default function AiPanel({ submissionId, canRun = false }) {
  const { t } = useTranslation()

  const [analysis, setAnalysis] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [running,  setRunning]  = useState(false)
  const [error,    setError]    = useState('')

  /** Loads the latest saved analysis from the API. */
  const loadAnalysis = useCallback(async () => {
    try {
      const { data } = await api.get(`/ai/analyze/${submissionId}`)
      setAnalysis(data.data)
    } catch {
      setError(t('ai.loadError'))
    } finally {
      setLoading(false)
    }
  }, [submissionId, t])

  useEffect(() => { loadAnalysis() }, [loadAnalysis])

  /** Triggers a new AI analysis. */
  async function handleRun() {
    setRunning(true)
    setError('')
    try {
      const { data } = await api.post(`/ai/analyze/${submissionId}`)
      setAnalysis(data.data)
    } catch {
      setError(t('ai.runError'))
    } finally {
      setRunning(false)
    }
  }

  // ─── Loading ───────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 text-center text-sm text-gray-400">
        {t('common.loading')}
      </div>
    )
  }

  const result = analysis?.result
  const cfg    = result ? (RISK_CONFIG[result.riskLevel] ?? RISK_CONFIG.LOW) : null

  return (
    <section aria-label={t('ai.panelLabel')}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
        style={{ background: 'var(--lev-navy)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🤖</span>
          <h2 className="text-sm font-bold text-white">{t('ai.panelTitle')}</h2>
        </div>
        <span className="text-xs text-blue-200">{t('ai.advisoryOnly')}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* No analysis yet */}
        {!result && (
          <p className="text-sm text-gray-400 text-center py-2">{t('ai.noAnalysis')}</p>
        )}

        {/* Analysis result */}
        {result && (
          <>
            {/* Risk badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ background: cfg.bg, borderColor: cfg.border }}>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">{t('ai.riskLevel')}</p>
                <p className="text-base font-bold" style={{ color: cfg.text }}>
                  {t(cfg.label)}
                </p>
              </div>
              <ScoreBar score={result.score} />
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{t('ai.summary')}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Flags */}
            {result.flags?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  {t('ai.flags')} ({result.flags.length})
                </p>
                <ul className="space-y-1" aria-label={t('ai.flags')}>
                  {result.flags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true">⚠</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">{t('ai.suggestions')}</p>
                <ul className="space-y-1" aria-label={t('ai.suggestions')}>
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">
              {result.disclaimer}
            </p>

            {/* Analysis date */}
            {analysis?.createdAt && (
              <p className="text-xs text-gray-400 text-center">
                {t('ai.analysisDate')}: {new Date(analysis.createdAt).toLocaleDateString()}
              </p>
            )}
          </>
        )}

        {/* Run button */}
        {canRun && (
          <button
            onClick={handleRun}
            disabled={running}
            className="w-full py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-60 transition hover:opacity-90"
            style={{ background: 'var(--lev-navy)', minHeight: '44px' }}>
            {running
              ? t('ai.running')
              : result
                ? t('ai.rerun')
                : t('ai.run')}
          </button>
        )}
      </div>
    </section>
  )
}
