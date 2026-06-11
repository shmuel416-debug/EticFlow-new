/**
 * Ethic-Net — ConditionEditor
 * AND/OR conditional rule editor for form builder field settings.
 * @module components/formBuilder/ConditionEditor
 */

import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import {
  getEligibleSourceFields,
  getFieldId,
  getOperatorsForFieldType,
  normalizeConditions,
  validateConditionGraph,
} from '../../utils/formConditions.js'

const LOGIC_OPTIONS = ['AND', 'OR']

/**
 * Builds a blank condition rule for a source field.
 * @param {string} fieldId
 * @returns {{ fieldId: string, operator: string, value: string }}
 */
function createBlankRule(fieldId) {
  return { fieldId, operator: 'equals', value: '' }
}

/**
 * @param {{
 *   conditions: object|null,
 *   targetFieldId: string,
 *   allFields: object[],
 *   onChange: (next: object|null) => void,
 * }} props
 */
export default function ConditionEditor({ conditions, targetFieldId, allFields, onChange }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'he'
  const normalized = normalizeConditions(conditions) ?? { logic: 'AND', rules: [] }
  const sources = getEligibleSourceFields(targetFieldId, allFields)

  /** @param {object} next */
  const emit = (next) => {
    const clean = normalizeConditions(next)
    onChange(clean)
  }

  const setLogic = (logic) => emit({ ...normalized, logic })

  const updateRule = (index, patch) => {
    const rules = normalized.rules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    emit({ ...normalized, rules })
  }

  const addRule = () => {
    const firstId = getFieldId(sources[0])
    if (!firstId) return
    emit({ ...normalized, rules: [...normalized.rules, createBlankRule(firstId)] })
  }

  const removeRule = (index) => {
    const rules = normalized.rules.filter((_, i) => i !== index)
    emit({ ...normalized, rules })
  }

  const graphCheck = validateConditionGraph(
    allFields.map(f => (getFieldId(f) === targetFieldId ? { ...f, conditions: normalized } : f))
  )

  if (sources.length === 0) {
    return (
      <p className="text-xs text-gray-400">{t('secretary.formBuilder.conditionalNoSources')}</p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{t('secretary.formBuilder.conditionalLogic')}</span>
        <div className="flex gap-1" role="group" aria-label={t('secretary.formBuilder.conditionalLogic')}>
          {LOGIC_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              aria-pressed={normalized.logic === opt}
              onClick={() => setLogic(opt)}
              className="px-2 py-1 text-xs rounded font-semibold"
              style={{
                background: normalized.logic === opt ? 'var(--lev-navy)' : '#f3f4f6',
                color: normalized.logic === opt ? '#fff' : '#6b7280',
                minHeight: 36,
              }}
            >
              {t(`secretary.formBuilder.conditionalLogic${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {normalized.rules.map((rule, index) => {
        const source = sources.find(f => getFieldId(f) === rule.fieldId) ?? sources[0]
        const sourceId = getFieldId(source)
        const operators = getOperatorsForFieldType(source?.type ?? 'text')
        const label = lang === 'en' && source?.labelEn ? source.labelEn : (source?.labelHe || sourceId)

        return (
          <div key={index} className="rounded-lg border border-gray-200 p-2 space-y-2">
            <div className="flex gap-2 items-start">
              <select
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2"
                value={rule.fieldId}
                onChange={e => updateRule(index, { fieldId: e.target.value, operator: 'equals', value: '' })}
                aria-label={t('secretary.formBuilder.conditionalSourceField')}
              >
                {sources.map(f => {
                  const id = getFieldId(f)
                  const name = lang === 'en' && f.labelEn ? f.labelEn : (f.labelHe || id)
                  return <option key={id} value={id}>{name}</option>
                })}
              </select>
              <button type="button" onClick={() => removeRule(index)}
                aria-label={t('secretary.formBuilder.conditionalRemoveRule')}
                className="p-2 rounded hover:bg-red-50" style={{ minHeight: 36, minWidth: 36 }}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
            <select
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"
              value={rule.operator}
              onChange={e => updateRule(index, { operator: e.target.value })}
              aria-label={t('secretary.formBuilder.conditionalOperator')}
            >
              {operators.map(op => (
                <option key={op} value={op}>{t(`secretary.formBuilder.conditionalOp_${op}`)}</option>
              ))}
            </select>
            {!['empty', 'not_empty'].includes(rule.operator) && (
              <RuleValueInput
                source={source}
                rule={rule}
                lang={lang}
                onChange={value => updateRule(index, { value })}
              />
            )}
            <p className="text-[10px] text-gray-400">{label}</p>
          </div>
        )
      })}

      <button type="button" onClick={addRule}
        className="text-xs font-semibold flex items-center gap-1"
        style={{ color: 'var(--lev-teal-text)', minHeight: 44 }}>
        <Plus size={14} aria-hidden="true" />
        {t('secretary.formBuilder.settingsAddCondition')}
      </button>

      {!graphCheck.valid && (
        <p role="alert" className="text-xs text-red-600">
          {t(`secretary.formBuilder.conditionalError_${graphCheck.error}`)}
        </p>
      )}
    </div>
  )
}

/**
 * Value input for a condition rule based on source field type.
 * @param {{ source: object, rule: object, lang: string, onChange: (v: *) => void }} props
 */
function RuleValueInput({ source, rule, lang, onChange }) {
  const { t } = useTranslation()
  const options = source?.options ?? []

  if (source?.type === 'checkbox' && options.length > 0) {
    return (
      <select
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"
        value={rule.value ?? ''}
        onChange={e => onChange(e.target.value)}
        aria-label={t('secretary.formBuilder.conditionalValue')}
      >
        <option value="">{t('secretary.formBuilder.conditionalSelectValue')}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {lang === 'en' && opt.labelEn ? opt.labelEn : opt.labelHe}
          </option>
        ))}
      </select>
    )
  }

  if ((source?.type === 'select' || source?.type === 'radio') && options.length > 0) {
    return (
      <select
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"
        value={rule.value ?? ''}
        onChange={e => onChange(e.target.value)}
        aria-label={t('secretary.formBuilder.conditionalValue')}
      >
        <option value="">{t('secretary.formBuilder.conditionalSelectValue')}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {lang === 'en' && opt.labelEn ? opt.labelEn : opt.labelHe}
          </option>
        ))}
      </select>
    )
  }

  if (source?.type === 'number') {
    return (
      <input
        type="number"
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"
        value={rule.value ?? ''}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        aria-label={t('secretary.formBuilder.conditionalValue')}
      />
    )
  }

  return (
    <input
      type="text"
      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2"
      value={rule.value ?? ''}
      onChange={e => onChange(e.target.value)}
      aria-label={t('secretary.formBuilder.conditionalValue')}
    />
  )
}
