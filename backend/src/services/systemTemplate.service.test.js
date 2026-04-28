/**
 * Unit Tests — System Template Service
 */

import * as systemTemplateService from './systemTemplate.service.js'
import { prisma } from '../db/index.js'
import { AppError } from '../middleware/error.js'

describe('systemTemplate.service', () => {
  const mockFile = {
    originalname: 'questionnaire-he.docx',
    buffer: Buffer.from('test content'),
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
  }

  const mockUserId = 'user-123'

  describe('uploadNewVersion', () => {
    it('should create new version for valid template key', async () => {
      const result = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      expect(result).toBeDefined()
      expect(result.key).toBe('questionnaire_preface')
      expect(result.lang).toBe('he')
      expect(result.version).toBe(1) // First version
      expect(result.isActive).toBe(true)
    })

    it('should increment version number for subsequent uploads', async () => {
      const v1 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'en',
        mockFile,
        mockUserId
      )

      const v2 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'en',
        mockFile,
        mockUserId
      )

      expect(v2.version).toBe(v1.version + 1)
    })

    it('should deactivate previous version when uploading new one', async () => {
      const v1 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      const v2 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      const v1Fresh = await prisma.systemTemplate.findUnique({
        where: { id: v1.id },
      })

      expect(v1Fresh.isActive).toBe(false)
      expect(v2.isActive).toBe(true)
    })

    it('should reject invalid template key', async () => {
      await expect(
        systemTemplateService.uploadNewVersion(
          'invalid_key',
          'he',
          mockFile,
          mockUserId
        )
      ).rejects.toThrow(AppError)
    })

    it('should reject invalid language', async () => {
      await expect(
        systemTemplateService.uploadNewVersion(
          'questionnaire_preface',
          'fr',
          mockFile,
          mockUserId
        )
      ).rejects.toThrow(AppError)
    })

    it('should reject invalid MIME type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' }
      await expect(
        systemTemplateService.uploadNewVersion(
          'questionnaire_preface',
          'he',
          invalidFile,
          mockUserId
        )
      ).rejects.toThrow(AppError)
    })

    it('should reject oversized file', async () => {
      const largeFile = {
        ...mockFile,
        size: 6 * 1024 * 1024, // > 5MB limit
      }
      await expect(
        systemTemplateService.uploadNewVersion(
          'questionnaire_preface',
          'he',
          largeFile,
          mockUserId
        )
      ).rejects.toThrow(AppError)
    })
  })

  describe('getActive', () => {
    it('should return active template', async () => {
      const uploaded = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      const retrieved = await systemTemplateService.getActive('questionnaire_preface', 'he')

      expect(retrieved.id).toBe(uploaded.id)
      expect(retrieved.isActive).toBe(true)
    })

    it('should return null when no template exists', async () => {
      const result = await systemTemplateService.getActive('questionnaire_preface', 'fr')
      expect(result).toBeNull()
    })

    it('should reject invalid key', async () => {
      await expect(
        systemTemplateService.getActive('invalid', 'he')
      ).rejects.toThrow(AppError)
    })
  })

  describe('listVersions', () => {
    it('should list all versions for a key (both languages)', async () => {
      await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )
      await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'en',
        mockFile,
        mockUserId
      )

      const versions = await systemTemplateService.listVersions('questionnaire_preface')

      expect(versions.length).toBeGreaterThanOrEqual(2)
      expect(versions.some((v) => v.lang === 'he')).toBe(true)
      expect(versions.some((v) => v.lang === 'en')).toBe(true)
    })

    it('should reject invalid key', async () => {
      await expect(
        systemTemplateService.listVersions('invalid')
      ).rejects.toThrow(AppError)
    })
  })

  describe('rollbackToVersion', () => {
    it('should restore previous version', async () => {
      const v1 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      const v2 = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      await systemTemplateService.rollbackToVersion(
        'questionnaire_preface',
        'he',
        v1.version
      )

      const restored = await systemTemplateService.getActive('questionnaire_preface', 'he')

      expect(restored.version).toBe(v1.version)
      expect(restored.id).toBe(v1.id)
    })

    it('should reject non-existent version', async () => {
      await expect(
        systemTemplateService.rollbackToVersion(
          'questionnaire_preface',
          'he',
          999
        )
      ).rejects.toThrow(AppError)
    })
  })

  describe('archiveTemplate', () => {
    it('should deactivate active template', async () => {
      const uploaded = await systemTemplateService.uploadNewVersion(
        'questionnaire_preface',
        'he',
        mockFile,
        mockUserId
      )

      await systemTemplateService.archiveTemplate('questionnaire_preface', 'he')

      const archived = await prisma.systemTemplate.findUnique({
        where: { id: uploaded.id },
      })

      expect(archived.isActive).toBe(false)
    })
  })

  describe('listAll', () => {
    it('should return grouped templates', async () => {
      const grouped = await systemTemplateService.listAll()

      expect(grouped).toHaveProperty('questionnaire_preface')
      expect(Array.isArray(grouped.questionnaire_preface)).toBe(true)
    })
  })
})
