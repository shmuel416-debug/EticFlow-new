/**
 * Unit Tests — System Template Service
 */

import { jest } from '@jest/globals'
import { AppError } from '../utils/errors.js'

const rows = []
let idCounter = 0

const prismaMock = {
  systemTemplate: {
    findFirst: jest.fn(async ({ where, orderBy, select, include }) => {
      let filtered = rows.filter((row) => {
        if (where?.key && row.key !== where.key) return false
        if (where?.lang && row.lang !== where.lang) return false
        if (where?.isActive !== undefined && row.isActive !== where.isActive) return false
        return true
      })
      if (orderBy?.version === 'desc') {
        filtered = [...filtered].sort((a, b) => b.version - a.version)
      }
      const hit = filtered[0]
      if (!hit) return null
      if (select?.version) return { version: hit.version }
      if (include?.uploader) {
        return { ...hit, uploader: { fullName: 'Mock User' } }
      }
      return { ...hit }
    }),
    findMany: jest.fn(async ({ where, orderBy, include } = {}) => {
      let filtered = rows.filter((row) => {
        if (where?.key && row.key !== where.key) return false
        return true
      })
      if (Array.isArray(orderBy)) {
        filtered = [...filtered].sort((a, b) => {
          if (a.key !== b.key) return a.key.localeCompare(b.key)
          if (a.lang !== b.lang) return a.lang.localeCompare(b.lang)
          return b.version - a.version
        })
      }
      return filtered.map((row) => (
        include?.uploader
          ? { ...row, uploader: { fullName: 'Mock User' } }
          : { ...row }
      ))
    }),
    updateMany: jest.fn(async ({ where, data }) => {
      let count = 0
      for (const row of rows) {
        if (where?.key && row.key !== where.key) continue
        if (where?.lang && row.lang !== where.lang) continue
        if (where?.isActive !== undefined && row.isActive !== where.isActive) continue
        Object.assign(row, data)
        count += 1
      }
      return { count }
    }),
    create: jest.fn(async ({ data, include }) => {
      const created = {
        id: `tpl-${++idCounter}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      }
      rows.push(created)
      if (include?.uploader) return { ...created, uploader: { fullName: 'Mock User' } }
      return { ...created }
    }),
    findUnique: jest.fn(async ({ where }) => {
      if (where?.id) {
        return rows.find((row) => row.id === where.id) ?? null
      }
      if (where?.key_lang_version) {
        const { key, lang, version } = where.key_lang_version
        return rows.find((row) => row.key === key && row.lang === lang && row.version === version) ?? null
      }
      return null
    }),
    update: jest.fn(async ({ where, data, include }) => {
      const hit = rows.find((row) => row.id === where.id)
      if (!hit) throw new Error('Missing row')
      Object.assign(hit, data, { updatedAt: new Date() })
      if (include?.uploader) return { ...hit, uploader: { fullName: 'Mock User' } }
      return { ...hit }
    }),
  },
}

const storageMock = {
  save: jest.fn(async () => undefined),
}

jest.unstable_mockModule('../db/index.js', () => ({
  prisma: prismaMock,
  default: prismaMock,
}))

jest.unstable_mockModule('./storage.service.js', () => ({
  storage: storageMock,
}))

const systemTemplateService = await import('./systemTemplate.service.js')

describe('systemTemplate.service', () => {
  const mockFile = {
    originalname: 'questionnaire-he.docx',
    buffer: Buffer.from('test content'),
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
  }

  const mockUserId = 'user-123'

  beforeEach(() => {
    rows.length = 0
    idCounter = 0
    jest.clearAllMocks()
  })

  test('uploadNewVersion creates first version and marks active', async () => {
    const result = await systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', mockFile, mockUserId)
    expect(result.version).toBe(1)
    expect(result.isActive).toBe(true)
    expect(storageMock.save).toHaveBeenCalledTimes(1)
  })

  test('uploadNewVersion increments version and deactivates previous', async () => {
    const v1 = await systemTemplateService.uploadNewVersion('questionnaire_preface', 'en', mockFile, mockUserId)
    const v2 = await systemTemplateService.uploadNewVersion('questionnaire_preface', 'en', mockFile, mockUserId)
    const first = rows.find((row) => row.id === v1.id)
    expect(v2.version).toBe(v1.version + 1)
    expect(first.isActive).toBe(false)
    expect(v2.isActive).toBe(true)
  })

  test('uploadNewVersion validates key/lang/mime/size', async () => {
    await expect(
      systemTemplateService.uploadNewVersion('invalid', 'he', mockFile, mockUserId)
    ).rejects.toThrow(AppError)
    await expect(
      systemTemplateService.uploadNewVersion('questionnaire_preface', 'fr', mockFile, mockUserId)
    ).rejects.toThrow(AppError)
    await expect(
      systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', { ...mockFile, mimetype: 'text/plain' }, mockUserId)
    ).rejects.toThrow(AppError)
    await expect(
      systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', { ...mockFile, size: 6 * 1024 * 1024 }, mockUserId)
    ).rejects.toThrow(AppError)
  })

  test('getActive and listVersions return expected data', async () => {
    const created = await systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', mockFile, mockUserId)
    const active = await systemTemplateService.getActive('questionnaire_preface', 'he')
    const versions = await systemTemplateService.listVersions('questionnaire_preface')
    expect(active.id).toBe(created.id)
    expect(versions.length).toBe(1)
  })

  test('rollbackToVersion restores previous active version', async () => {
    const v1 = await systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', mockFile, mockUserId)
    await systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', mockFile, mockUserId)
    const restored = await systemTemplateService.rollbackToVersion('questionnaire_preface', 'he', v1.version)
    expect(restored.version).toBe(v1.version)
    expect(restored.isActive).toBe(true)
  })

  test('rollbackToVersion rejects missing target version', async () => {
    await expect(
      systemTemplateService.rollbackToVersion('questionnaire_preface', 'he', 999)
    ).rejects.toThrow(AppError)
  })

  test('archiveTemplate deactivates active row and listAll groups keys', async () => {
    await systemTemplateService.uploadNewVersion('questionnaire_preface', 'he', mockFile, mockUserId)
    await systemTemplateService.archiveTemplate('questionnaire_preface', 'he')
    const grouped = await systemTemplateService.listAll()
    expect(grouped).toHaveProperty('questionnaire_preface')
    expect(grouped.questionnaire_preface[0].isActive).toBe(false)
  })
})
