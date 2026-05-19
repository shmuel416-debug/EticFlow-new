/**
 * EthicFlow — system template service regression tests.
 * Guards active-template availability when file storage fails.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  systemTemplate: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

const storageMock = {
  save: jest.fn(),
}

jest.unstable_mockModule('../src/db/index.js', () => ({
  prisma: prismaMock,
}))
jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  storage: storageMock,
}))

const { rollbackToVersion, uploadNewVersion } = await import('../src/services/systemTemplate.service.js')

const pdfFile = {
  originalname: 'preface.pdf',
  buffer: Buffer.from('%PDF-1.4'),
  mimetype: 'application/pdf',
  size: 128,
}

describe('systemTemplate.service activation safety', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.systemTemplate.findFirst.mockResolvedValue({ version: 1 })
  })

  test('uploadNewVersion keeps current active template when storage save fails', async () => {
    storageMock.save.mockRejectedValue(new Error('storage unavailable'))

    await expect(uploadNewVersion('questionnaire_preface', 'he', pdfFile, 'admin-1')).rejects.toThrow(
      'storage unavailable'
    )

    expect(prismaMock.systemTemplate.updateMany).not.toHaveBeenCalled()
    expect(prismaMock.systemTemplate.create).not.toHaveBeenCalled()
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  test('rollbackToVersion deactivates and activates versions in one transaction', async () => {
    prismaMock.systemTemplate.findUnique.mockResolvedValue({ id: 'tpl-1' })
    prismaMock.$transaction.mockImplementation(async (callback) => callback({
      systemTemplate: {
        updateMany: prismaMock.systemTemplate.updateMany,
        update: prismaMock.systemTemplate.update,
      },
    }))
    prismaMock.systemTemplate.update.mockResolvedValue({ id: 'tpl-1', isActive: true })

    await rollbackToVersion('questionnaire_preface', 'he', 1)

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
    expect(prismaMock.systemTemplate.updateMany).toHaveBeenCalledWith({
      where: { key: 'questionnaire_preface', lang: 'he', isActive: true },
      data: { isActive: false },
    })
    expect(prismaMock.systemTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl-1' },
      data: { isActive: true },
      include: { uploader: { select: { fullName: true } } },
    })
  })
})
