/**
 * InstructionsAccordion — Instructions & Attachments Display
 * Collapsed accordion with markdown-rendered instructions + attachments list.
 * Appears at top of form submission.
 */

import { useState } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardHeader, CardBody } from './ui'

/**
 * @param {{
 *   instructionsHe?: string,
 *   instructionsEn?: string,
 *   attachmentsList?: Array<{id: string, name: string, nameEn: string, required: boolean, note?: string}>,
 *   lang: 'he' | 'en'
 * }} props
 */
export default function InstructionsAccordion({
  instructionsHe,
  instructionsEn,
  attachmentsList = [],
  lang,
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const instructions = lang === 'he' ? instructionsHe : instructionsEn
  if (!instructions && attachmentsList.length === 0) return null

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <Card as="section" className="mb-5">
      <button
        onClick={toggleOpen}
        className="w-full text-left flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="instructions-content"
        data-testid="instructions-accordion-toggle"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">
            ℹ️
          </span>
          <span className="font-semibold text-sm" style={{ color: 'var(--lev-navy)' }}>
            {t('forms.instructions.title')}
          </span>
        </div>
        <ChevronDown
          size={20}
          strokeWidth={2}
          aria-hidden="true"
          style={{
            transition: 'transform 200ms ease-in-out',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && (
        <CardBody id="instructions-content">
          {instructions && (
            <div className="mb-6">
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dir={lang === 'he' ? 'rtl' : 'ltr'}
                data-testid="instructions-content"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {instructions}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {attachmentsList.length > 0 && (
            <div
              dir={lang === 'he' ? 'rtl' : 'ltr'}
              data-testid="attachments-list"
            >
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--lev-navy)' }}>
                {t('forms.attachments.required')}
              </h4>
              <ul className="space-y-2">
                {attachmentsList.map(att => {
                  const name = lang === 'he' ? att.name : att.nameEn
                  return (
                    <li
                      key={att.id}
                      className="flex items-start gap-2 text-sm"
                      data-testid={`attachment-${att.id}`}
                    >
                      <span className="text-gray-500 mt-1" aria-hidden="true">
                        {att.required ? '●' : '○'}
                      </span>
                      <div>
                        <div className="font-medium text-gray-700">
                          {name}
                          {att.required && (
                            <span className="ml-1 text-red-500 font-bold" aria-label={t('common.required')}>
                              *
                            </span>
                          )}
                        </div>
                        {att.note && (
                          <div className="text-xs text-gray-500 mt-1">{att.note}</div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div
                className="mt-4 p-3 rounded-lg flex items-start gap-2 text-xs"
                style={{ background: 'var(--info-50)', color: 'var(--text-secondary)' }}
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <p>{t('forms.attachments.uploadNote')}</p>
              </div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  )
}
