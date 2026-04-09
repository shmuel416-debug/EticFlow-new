/**
 * EthicFlow — FormFieldPreview
 * Renders a single form field in read-only preview mode.
 * Supports all 12 field types. Lev color palette only. IS 5568 / WCAG 2.1 AA.
 * @module components/formBuilder/FormFieldPreview
 */

import { useTranslation } from 'react-i18next'

/* Shared input class — Lev palette, 44px min height */
const INPUT_CLASS =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none'
const INPUT_FOCUS = { borderColor: 'var(--lev-teal)' }
const INPUT_BLUR  = { borderColor: '' }

/**
 * Wrapper with label + required asterisk.
 * @param {{ id: string, label: string, required: boolean, hint?: string, children: React.ReactNode }} props
 */
function FieldWrapper({ id, label, required, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id}
        className="block text-sm font-semibold"
        style={{ color: 'var(--lev-navy)' }}>
        {label}
        {required && (
          <span aria-label="שדה חובה" style={{ color: 'var(--lev-purple)' }} className="ms-1">*</span>
        )}
      </label>
      {hint && (
        <p className="text-xs" style={{ color: 'var(--lev-teal-text)' }}>{hint}</p>
      )}
      {children}
    </div>
  )
}

/**
 * Renders a single field in preview mode (not editable by design, but interactive for UX feel).
 * @param {{ field: object, previewLang: 'he'|'en' }} props
 */
export default function FormFieldPreview({ field, previewLang }) {
  const { t } = useTranslation()
  const id    = `preview-${field.id}`
  const label = (previewLang === 'en' && field.labelEn) ? field.labelEn : (field.labelHe || field.labelEn || t(`secretary.fieldTypes.${field.type}`))
  const ph    = field.placeholderHe || ''

  /* ── Text-like inputs ── */
  if (['text', 'email', 'phone', 'number'].includes(field.type)) {
    const typeMap = { text: 'text', email: 'email', phone: 'tel', number: 'number' }
    return (
      <FieldWrapper id={id} label={label} required={field.required}>
        <input id={id} type={typeMap[field.type]} placeholder={ph}
          aria-required={field.required}
          className={INPUT_CLASS}
          style={{ minHeight: '44px' }}
          onFocus={e => Object.assign(e.target.style, INPUT_FOCUS)}
          onBlur={e  => Object.assign(e.target.style, INPUT_BLUR)}
        />
      </FieldWrapper>
    )
  }

  /* ── Textarea ── */
  if (field.type === 'textarea') {
    return (
      <FieldWrapper id={id} label={label} required={field.required}>
        <textarea id={id} placeholder={ph} rows={3}
          aria-required={field.required}
          className={`${INPUT_CLASS} resize-none`}
          onFocus={e => Object.assign(e.target.style, INPUT_FOCUS)}
          onBlur={e  => Object.assign(e.target.style, INPUT_BLUR)}
        />
      </FieldWrapper>
    )
  }

  /* ── Date ── */
  if (field.type === 'date') {
    return (
      <FieldWrapper id={id} label={label} required={field.required}>
        <input id={id} type="date"
          aria-required={field.required}
          className={INPUT_CLASS}
          style={{ minHeight: '44px' }}
          onFocus={e => Object.assign(e.target.style, INPUT_FOCUS)}
          onBlur={e  => Object.assign(e.target.style, INPUT_BLUR)}
        />
      </FieldWrapper>
    )
  }

  /* ── Select ── */
  if (field.type === 'select') {
    return (
      <FieldWrapper id={id} label={label} required={field.required}>
        <select id={id} aria-required={field.required}
          className={INPUT_CLASS}
          style={{ minHeight: '44px' }}
          onFocus={e => Object.assign(e.target.style, INPUT_FOCUS)}
          onBlur={e  => Object.assign(e.target.style, INPUT_BLUR)}
          defaultValue="">
          <option value="" disabled>{t('secretary.formPreview.selectPlaceholder')}</option>
          <option value="1">{t('secretary.formPreview.sampleOption1')}</option>
          <option value="2">{t('secretary.formPreview.sampleOption2')}</option>
        </select>
      </FieldWrapper>
    )
  }

  /* ── Radio ── */
  if (field.type === 'radio') {
    return (
      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold mb-2" style={{ color: 'var(--lev-navy)' }}>
          {label}
          {field.required && <span aria-label="שדה חובה" style={{ color: 'var(--lev-purple)' }} className="ms-1">*</span>}
        </legend>
        {[t('secretary.formPreview.sampleOption1'), t('secretary.formPreview.sampleOption2')].map((opt, i) => (
          <label key={i} className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: '44px' }}>
            <input type="radio" name={id} value={i} className="accent-[var(--lev-navy)]" />
            <span style={{ color: '#374151' }}>{opt}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  /* ── Checkbox ── */
  if (field.type === 'checkbox') {
    return (
      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold mb-2" style={{ color: 'var(--lev-navy)' }}>
          {label}
          {field.required && <span aria-label="שדה חובה" style={{ color: 'var(--lev-purple)' }} className="ms-1">*</span>}
        </legend>
        {[t('secretary.formPreview.sampleOption1'), t('secretary.formPreview.sampleOption2')].map((opt, i) => (
          <label key={i} className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: '44px' }}>
            <input type="checkbox" className="accent-[var(--lev-navy)]" />
            <span style={{ color: '#374151' }}>{opt}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  /* ── File upload ── */
  if (field.type === 'file') {
    return (
      <FieldWrapper id={id} label={label} required={field.required}
        hint={t('secretary.formPreview.fileHint')}>
        <label htmlFor={id}
          className="flex items-center justify-center gap-2 w-full border-2 border-dashed
            rounded-lg p-4 cursor-pointer text-sm transition-colors hover:bg-blue-50/30"
          style={{ borderColor: 'var(--lev-teal)', color: 'var(--lev-teal-text)', minHeight: '60px' }}>
          <span aria-hidden="true">📎</span>
          {t('secretary.formPreview.fileButton')}
          <input id={id} type="file" className="sr-only" aria-required={field.required} />
        </label>
      </FieldWrapper>
    )
  }

  /* ── Declaration ── */
  if (field.type === 'declaration') {
    return (
      <div className="border rounded-xl p-4 space-y-3"
        style={{ borderColor: 'var(--lev-teal)', background: '#f0f9ff' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--lev-navy)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--lev-teal-text)' }}>
          {t('secretary.formPreview.declarationSample')}
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: '44px' }}>
          <input type="checkbox" id={id} aria-required={field.required}
            className="accent-[var(--lev-navy)]" />
          <span style={{ color: '#374151' }}>{t('secretary.formPreview.declarationAccept')}</span>
        </label>
      </div>
    )
  }

  /* ── Signature ── */
  if (field.type === 'signature') {
    return (
      <FieldWrapper id={id} label={label} required={field.required}
        hint={t('secretary.formPreview.signatureHint')}>
        <div
          className="w-full rounded-xl border-2 border-dashed flex items-center justify-center"
          style={{ borderColor: 'var(--lev-teal)', minHeight: '100px', background: '#fafafa' }}
          role="img"
          aria-label={t('secretary.formPreview.signatureArea')}>
          <span className="text-sm" style={{ color: 'var(--lev-teal-text)' }}>
            {t('secretary.formPreview.signatureHint')}
          </span>
        </div>
      </FieldWrapper>
    )
  }

  return null
}
