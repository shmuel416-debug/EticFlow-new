/**
 * EthicFlow — FormRenderer
 * Renders dynamic form fields from JSON schema interactively.
 * Supports all 12 field types. IS 5568 / WCAG 2.1 AA. Lev palette only.
 * @module components/formRenderer/FormRenderer
 */

import { useTranslation } from 'react-i18next'

const INPUT_BASE = 'w-full text-sm border rounded-lg px-3 py-2.5 bg-white focus:outline-none transition-colors'

/**
 * Shared input styles — Lev teal focus ring, red on error.
 * @param {boolean} hasError
 * @returns {object} style object
 */
function inputStyle(hasError) {
  return {
    borderColor: hasError ? '#dc2626' : '#e5e7eb',
    minHeight: '44px',
  }
}

/** Focus / blur handlers for Lev teal ring */
const onFocus = e => { if (!e.target.dataset.error) e.target.style.borderColor = 'var(--lev-teal)' }
const onBlur  = e => { if (!e.target.dataset.error) e.target.style.borderColor = '#e5e7eb' }

/**
 * Label with required star.
 * @param {{ id: string, label: string, required: boolean }} props
 */
function FieldLabel({ id, label, required }) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--lev-navy)' }}>
      {label}
      {required && <span aria-label="שדה חובה" className="ms-0.5" style={{ color: 'var(--lev-purple)' }}>*</span>}
    </label>
  )
}

/**
 * Inline error / success message under a field.
 * id prop wires up aria-describedby from the parent input.
 * @param {{ id?: string, error: string, valid: boolean }} props
 */
function FieldFeedback({ id, error, valid }) {
  const { t } = useTranslation()
  if (error) return <p id={id} role="alert" aria-live="polite" className="text-xs mt-1 text-red-600">{error}</p>
  if (valid) return <p className="text-xs mt-1" style={{ color: '#16a34a' }}>✓ {t('submission.submit.validField')}</p>
  return null
}

/**
 * Renders a single field based on its type.
 * @param {{ field: object, value: any, error: string, lang: 'he'|'en', onChange: fn }} props
 */
export function FormField({ field, value, error, lang, onChange }) {
  const { t }  = useTranslation()
  const id     = `field-${field.id}`
  const label  = (lang === 'en' && field.labelEn) ? field.labelEn : (field.labelHe || t(`secretary.fieldTypes.${field.type}`))
  const ph     = field.placeholderHe || ''
  const hasErr = Boolean(error)
  const isValid = !hasErr && Boolean(value)

  if (['text', 'email', 'phone', 'number'].includes(field.type)) {
    const typeMap = { text: 'text', email: 'email', phone: 'tel', number: 'number' }
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <input id={id} type={typeMap[field.type]} value={value || ''} placeholder={ph}
          aria-required={field.required} aria-invalid={hasErr}
          aria-describedby={hasErr ? `${id}-err` : undefined}
          data-error={hasErr || undefined}
          className={INPUT_BASE} style={inputStyle(hasErr)}
          onChange={e => onChange(field.id, e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
        />
        <FieldFeedback id={`${id}-err`} error={error} valid={isValid} />
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <textarea id={id} value={value || ''} placeholder={ph} rows={3}
          aria-required={field.required} aria-invalid={hasErr}
          data-error={hasErr || undefined}
          className={`${INPUT_BASE} resize-none`} style={{ borderColor: hasErr ? '#dc2626' : '#e5e7eb' }}
          onChange={e => onChange(field.id, e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
        />
        <FieldFeedback id={`${id}-err`} error={error} valid={isValid} />
      </div>
    )
  }

  if (field.type === 'date') {
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <input id={id} type="date" value={value || ''}
          aria-required={field.required} aria-invalid={hasErr}
          className={INPUT_BASE} style={inputStyle(hasErr)}
          onChange={e => onChange(field.id, e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
        />
        <FieldFeedback id={`${id}-err`} error={error} valid={isValid} />
      </div>
    )
  }

  if (field.type === 'select') {
    const opts = field.options || [t('submission.submit.sampleOption', { n: 1 }), t('submission.submit.sampleOption', { n: 2 })]
    const optValue = (opt) => typeof opt === 'string' ? opt : opt.value
    const optLabel = (opt) => typeof opt === 'string' ? opt : (lang === 'en' && opt.labelEn ? opt.labelEn : opt.labelHe)
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <select id={id} value={value || ''} aria-required={field.required} aria-invalid={hasErr}
          className={INPUT_BASE} style={inputStyle(hasErr)}
          onChange={e => onChange(field.id, e.target.value)}
          onFocus={onFocus} onBlur={onBlur}>
          <option value="" disabled>{t('submission.submit.selectPlaceholder')}</option>
          {opts.map((opt, i) => (
            <option key={i} value={optValue(opt)}>{optLabel(opt)}</option>
          ))}
        </select>
        <FieldFeedback id={`${id}-err`} error={error} valid={isValid} />
      </div>
    )
  }

  if (field.type === 'radio') {
    const opts = field.options || [t('submission.submit.sampleOption', { n: 1 }), t('submission.submit.sampleOption', { n: 2 })]
    const optValue = (opt) => typeof opt === 'string' ? opt : opt.value
    const optLabel = (opt) => typeof opt === 'string' ? opt : (lang === 'en' && opt.labelEn ? opt.labelEn : opt.labelHe)
    return (
      <fieldset aria-required={field.required}>
        <legend className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--lev-navy)' }}>
          {label}{field.required && <span aria-label={t('common.requiredField')} className="ms-0.5" style={{ color: 'var(--lev-purple)' }}>*</span>}
        </legend>
        {opts.map((opt, i) => {
          const val = optValue(opt)
          return (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer mb-1" style={{ minHeight: '44px' }}>
              <input type="radio" name={id} value={val} checked={value === val}
                onChange={() => onChange(field.id, val)} className="accent-[#1E2A72]" />
              {optLabel(opt)}
            </label>
          )
        })}
        <FieldFeedback id={`${id}-err`} error={error} valid={false} />
      </fieldset>
    )
  }

  if (field.type === 'checkbox') {
    const opts = field.options || [t('submission.submit.sampleOption', { n: 1 }), t('submission.submit.sampleOption', { n: 2 })]
    const optValue = (opt) => typeof opt === 'string' ? opt : opt.value
    const optLabel = (opt) => typeof opt === 'string' ? opt : (lang === 'en' && opt.labelEn ? opt.labelEn : opt.labelHe)
    const checked = Array.isArray(value) ? value : []
    return (
      <fieldset aria-required={field.required}>
        <legend className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--lev-navy)' }}>
          {label}{field.required && <span aria-label={t('common.requiredField')} className="ms-0.5" style={{ color: 'var(--lev-purple)' }}>*</span>}
        </legend>
        {opts.map((opt, i) => {
          const val = optValue(opt)
          return (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer mb-1" style={{ minHeight: '44px' }}>
              <input type="checkbox" value={val} checked={checked.includes(val)}
                onChange={e => onChange(field.id, e.target.checked ? [...checked, val] : checked.filter(v => v !== val))}
                className="accent-[#1E2A72]" />
              {optLabel(opt)}
            </label>
          )
        })}
        <FieldFeedback id={`${id}-err`} error={error} valid={false} />
      </fieldset>
    )
  }

  if (field.type === 'file') {
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <label htmlFor={id}
          className="flex flex-col items-center justify-center gap-1 w-full border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors hover:bg-blue-50/30 text-center"
          style={{ borderColor: hasErr ? '#dc2626' : 'var(--lev-teal)', minHeight: '80px' }}>
          <span aria-hidden="true" className="text-xl">📎</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--lev-teal-text)' }}>
            {value ? t('submission.submit.fileSelected', { name: value }) : t('submission.submit.fileButton')}
          </span>
          <span className="text-xs text-gray-400">{t('submission.submit.fileHint')}</span>
          <input id={id} type="file" className="sr-only" aria-required={field.required}
            onChange={e => onChange(field.id, e.target.files?.[0]?.name || '')} />
        </label>
        <FieldFeedback id={`${id}-err`} error={error} valid={false} />
      </div>
    )
  }

  if (field.type === 'declaration') {
    return (
      <div className="rounded-xl p-4 space-y-2" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--lev-navy)' }}>{label}</p>
        <p className="text-xs text-gray-600">{t('submission.submit.declarationText')}</p>
        <label className="flex items-start gap-2 cursor-pointer" style={{ minHeight: '44px' }}>
          <input type="checkbox" id={id} checked={Boolean(value)} aria-required={field.required}
            onChange={e => onChange(field.id, e.target.checked)} className="accent-[#1E2A72] mt-0.5" />
          <span className="text-xs">
            {t('submission.submit.declarationAccept')}
            {field.required && <span aria-label={t('common.requiredField')} className="ms-0.5" style={{ color: 'var(--lev-purple)' }}>*</span>}
          </span>
        </label>
        <FieldFeedback id={`${id}-err`} error={error} valid={false} />
      </div>
    )
  }

  if (field.type === 'signature') {
    return (
      <div>
        <FieldLabel id={id} label={label} required={field.required} />
        <div className="w-full rounded-xl border-2 border-dashed flex items-center justify-center"
          style={{ borderColor: 'var(--lev-teal)', minHeight: '80px', background: '#f9fafb' }}
          role="img" aria-label={t('submission.submit.signatureHint')}>
          <span className="text-xs" style={{ color: 'var(--lev-teal-text)' }}>{t('submission.submit.signatureHint')}</span>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Renders all form fields grouped into up to 3 visual sections.
 * @param {{ fields: object[], values: object, errors: object, lang: 'he'|'en', onChange: fn }} props
 */
export default function FormRenderer({ fields, values, errors, lang, onChange }) {
  return (
    <div className="space-y-5">
      {fields.map(field => (
        <FormField
          key={field.id}
          field={field}
          value={values[field.id]}
          error={errors[field.id]}
          lang={lang}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
