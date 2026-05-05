/**
 * EthicFlow — SubmissionLifecycle Component
 * Shared lifecycle timeline for researcher and staff views.
 */
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useStatusConfig from '../../hooks/useStatusConfig'

const NEXT_OWNER_ROLE_BY_STATUS = {
  SUBMITTED: 'SECRETARY',
  IN_TRIAGE: 'SECRETARY',
  ASSIGNED: 'REVIEWER',
  IN_REVIEW: 'CHAIRMAN',
  PENDING_REVISION: 'RESEARCHER',
}

const TERMINAL_TONES = {
  REJECTED: 'var(--status-danger)',
  WITHDRAWN: 'var(--text-muted)',
}

/**
 * Resolves whether a role should see action guidance.
 * @param {string|null|undefined} userRole
 * @returns {boolean}
 */
function isGuidedRole(userRole) {
  return ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'].includes(userRole || '')
}

/**
 * Shared lifecycle view for one submission.
 * @param {{
 *  submissionId?: string|null,
 *  currentStatus: string,
 *  userRole?: string,
 *  reviewer?: { fullName?: string }|null,
 *  variant?: 'full'|'compact',
 *  className?: string
 * }} props
 * @returns {JSX.Element|null}
 */
export default function SubmissionLifecycle({
  submissionId = null,
  currentStatus,
  userRole = '',
  reviewer = null,
  variant = 'full',
  className = '',
}) {
  const { t, i18n } = useTranslation()
  const { statuses } = useStatusConfig({
    submissionId: submissionId || undefined,
  })

  const baseTimeline = (statuses || [])
    .filter((status) => status.code !== 'DRAFT')
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map((status) => status.code)
  const timelineStatuses = currentStatus && !baseTimeline.includes(currentStatus)
    ? [...baseTimeline, currentStatus]
    : baseTimeline
  if (!currentStatus || timelineStatuses.length === 0) return null

  const statusMap = Object.fromEntries((statuses || []).map((status) => [status.code, status]))
  const currentStep = Math.max(1, timelineStatuses.indexOf(currentStatus) + 1)
  const totalSteps = Math.max(1, timelineStatuses.length)
  const progress = Math.round((currentStep / totalSteps) * 100)
  const nextOwnerRole = NEXT_OWNER_ROLE_BY_STATUS[currentStatus]
  const terminalTone = TERMINAL_TONES[currentStatus] || null
  const accentColor = terminalTone || 'var(--lev-teal-text)'

  /**
   * Resolves localized status title.
   * @param {string} code
   * @returns {string}
   */
  function getStatusLabel(code) {
    const statusMeta = statusMap[code]
    const fromDb = i18n.language === 'he' ? statusMeta?.labelHe : statusMeta?.labelEn
    return t(`submission.status.${code}`, fromDb || code)
  }

  /**
   * Resolves localized status description from DB or i18n fallback.
   * @param {string} code
   * @returns {string}
   */
  function getStatusDescription(code) {
    const statusMeta = statusMap[code]
    const fromDb = i18n.language === 'he' ? statusMeta?.descriptionHe : statusMeta?.descriptionEn
    if (fromDb) return fromDb
    const fallback = t(`submissionLifecycle.descriptions.${code}`, { defaultValue: '' })
    return fallback === `submissionLifecycle.descriptions.${code}` ? '' : fallback
  }

  const currentDescription = getStatusDescription(currentStatus)
  const currentOwnerRole = NEXT_OWNER_ROLE_BY_STATUS[currentStatus]
  const actionHintKey = `submissionLifecycle.actionHints.${userRole}.${currentStatus}`
  const actionHint = isGuidedRole(userRole) && currentOwnerRole && (userRole === currentOwnerRole || userRole === 'ADMIN')
    ? t(actionHintKey, { defaultValue: '' })
    : ''
  const shouldShowHint = actionHint && actionHint !== actionHintKey

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--surface-sunken)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('statusPage.currentStatusLabel')} {getStatusLabel(currentStatus)}
        </p>
        {currentDescription && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {currentDescription}
          </p>
        )}
        {nextOwnerRole && !terminalTone && (
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--lev-teal-text)' }}>
            {t('submissionLifecycle.nextOwner', { role: t(`roles.${nextOwnerRole}`) })}
          </p>
        )}
        {shouldShowHint && (
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--lev-navy)' }}>
            {actionHint}
          </p>
        )}
      </div>

      <div>
        <div
          className="h-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-label={t('statusPage.progressLabel', { current: currentStep, total: totalSteps })}
          style={{
            background: 'var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: accentColor,
              borderRadius: 'var(--radius-full)',
            }}
          />
        </div>
        <p className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('statusPage.progressLabel', { current: currentStep, total: totalSteps })}
        </p>
      </div>

      {variant === 'compact' ? (
        <div className="overflow-x-auto pb-1">
          <div
            className="min-w-max flex items-start gap-2"
            role="list"
            aria-label={t('statusPage.timeline')}
          >
            {timelineStatuses.map((statusCode, index) => {
              const done = currentStep > index + 1
              const current = currentStatus === statusCode
              const description = getStatusDescription(statusCode)
              return (
                <div key={statusCode} role="listitem" className="flex items-center gap-2">
                  <div className="w-24">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto"
                      aria-current={current ? 'step' : undefined}
                      style={{
                        background: done || current ? accentColor : 'var(--surface-sunken)',
                        color: done || current ? '#fff' : 'var(--text-muted)',
                      }}
                    >
                      {done ? <Check size={16} strokeWidth={2} aria-hidden="true" focusable="false" /> : <span>{index + 1}</span>}
                    </div>
                    <p className={`text-xs text-center mt-1 ${!done && !current ? 'opacity-50' : ''}`} style={{ color: current ? 'var(--lev-navy)' : 'var(--text-secondary)' }}>
                      {t(`statusPage.steps.${statusCode}`, getStatusLabel(statusCode))}
                    </p>
                    {description && (
                      <p className="text-[11px] text-center mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {description}
                      </p>
                    )}
                  </div>
                  {index < timelineStatuses.length - 1 && (
                    <div
                      className="w-6 h-0.5 mt-4"
                      style={{ background: done ? accentColor : 'var(--border-default)' }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-0" role="list" aria-label={t('statusPage.timeline')}>
          {timelineStatuses.map((statusCode, index) => {
            const done = currentStep > index + 1
            const current = currentStatus === statusCode
            const description = getStatusDescription(statusCode)
            return (
              <div
                key={statusCode}
                role="listitem"
                className="flex gap-4"
                aria-current={current ? 'step' : undefined}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background: done || current ? accentColor : 'var(--surface-sunken)',
                      color: done || current ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {done ? (
                      <Check size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
                    ) : (
                      <span aria-hidden="true">{index + 1}</span>
                    )}
                  </div>
                  {index < timelineStatuses.length - 1 && (
                    <div
                      className="my-1"
                      style={{
                        width: 2,
                        minHeight: 24,
                        background: done ? accentColor : 'var(--border-default)',
                      }}
                    />
                  )}
                </div>
                <div className={`pb-5 ${!done && !current ? 'opacity-40' : ''}`}>
                  <p className="text-sm font-semibold" style={{ color: current ? 'var(--lev-navy)' : 'var(--text-secondary)' }}>
                    {t(`statusPage.steps.${statusCode}`, getStatusLabel(statusCode))}
                    {current && (
                      <span className="text-xs font-normal ms-2" style={{ color: accentColor }}>
                        {t('statusPage.currentStep')}
                      </span>
                    )}
                  </p>
                  {description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {description}
                    </p>
                  )}
                  {statusCode === 'ASSIGNED' && reviewer?.fullName && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {t('statusPage.reviewer')}: {reviewer.fullName}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
