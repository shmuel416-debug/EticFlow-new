/**
 * EthicFlow — FormAnswersViewer Component
 * Read-only display of submission answers against the form schema.
 * Renders each field label + answer in a clean two-column layout.
 */

import { useTranslation } from 'react-i18next'

/**
 * Renders a single answer value based on field type.
 * @param {{ field: object, value: any }} props
 */
function FieldAnswer({ field, value }) {
  const { i18n, t } = useTranslation()
  const lang  = i18n.language === 'he' ? 'He' : 'En'
  const fieldId = field.id || field.key
  const label = field[`label${lang}`] ?? field.labelHe ?? fieldId

  const displayValue = () => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 italic">{t('submission.detail.noAnswer')}</span>
    }
    if (Array.isArray(value)) return <span>{value.join(', ')}</span>
    if (typeof value === 'boolean') return <span>{value ? '✓' : '✗'}</span>
    return <span className="whitespace-pre-wrap">{String(value)}</span>
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-gray-800">{displayValue()}</dd>
    </div>
  )
}

/**
 * Renders all form answers in read-only mode.
 * @param {{ formConfig: object, dataJson: object }} props
 */
export default function FormAnswersViewer({ formConfig, dataJson = {} }) {
  const { t } = useTranslation()

  if (!formConfig?.schemaJson?.fields?.length) {
    return <p className="text-sm text-gray-500">{t('submission.detail.noAnswer')}</p>
  }

  return (
    <dl className="divide-y divide-gray-100">
      {formConfig.schemaJson.fields.map((field) => {
        const fid = field.id || field.key
        return <FieldAnswer key={fid} field={field} value={dataJson[fid]} />
      })}
    </dl>
  )
}
