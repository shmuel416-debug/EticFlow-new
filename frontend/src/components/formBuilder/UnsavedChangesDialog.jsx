/**
 * Ethic-Net — UnsavedChangesDialog
 * Prompts before leaving Form Builder with unsaved changes.
 * @module components/formBuilder/UnsavedChangesDialog
 */

import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import { Button } from '../ui'

/**
 * @param {{
 *   isOpen: boolean,
 *   onCancel: () => void,
 *   onLeave: () => void,
 *   onSaveAndLeave: () => void,
 *   isSaving?: boolean,
 * }} props
 */
export default function UnsavedChangesDialog({ isOpen, onCancel, onLeave, onSaveAndLeave, isSaving = false }) {
  const { t } = useTranslation()

  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      title={t('secretary.formBuilder.unsavedChangesTitle')}
      description={t('secretary.formBuilder.unsavedChangesBody')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            {t('common.cancel')}
          </Button>
          <Button variant="secondary" onClick={onLeave} disabled={isSaving}>
            {t('secretary.formBuilder.leaveWithoutSaving')}
          </Button>
          <Button variant="primary" onClick={onSaveAndLeave} loading={isSaving}>
            {t('secretary.formBuilder.saveAndLeave')}
          </Button>
        </>
      }
    />
  )
}
