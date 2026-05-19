/**
 * EthicFlow — reviewer checklist template immutability tests.
 * Published templates must not be mutated by granular section/item APIs.
 */

import { jest } from '@jest/globals'

const prismaMock = {
  reviewerChecklistTemplate: {
    findUnique: jest.fn(),
  },
  reviewerChecklistSection: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  reviewerChecklistItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  reviewerChecklistReview: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))
jest.unstable_mockModule('../src/services/notification.service.js', () => ({
  notifyStatusChange: jest.fn(),
}))
jest.unstable_mockModule('../src/services/sla.service.js', () => ({
  setDueDates: jest.fn(),
}))

const service = await import('../src/services/reviewerChecklist.service.js')

const itemPayload = {
  code: 'CONSENT',
  label: 'Consent form is adequate',
  labelEn: 'Consent form is adequate',
  orderIndex: 1,
}

/**
 * Mocks a published checklist template lookup.
 * @returns {void}
 */
function mockPublishedTemplate() {
  prismaMock.reviewerChecklistTemplate.findUnique.mockResolvedValue({
    id: 'tpl-1',
    isPublished: true,
  })
}

describe('reviewerChecklist.service immutability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPublishedTemplate()
  })

  test('createItem blocks adding items to a published template section', async () => {
    prismaMock.reviewerChecklistSection.findUnique.mockResolvedValue({
      id: 'sec-1',
      templateId: 'tpl-1',
    })

    await expect(service.createItem('sec-1', itemPayload)).rejects.toMatchObject({
      code: 'TEMPLATE_PUBLISHED',
    })
    expect(prismaMock.reviewerChecklistItem.create).not.toHaveBeenCalled()
  })

  test('updateItem blocks changing an item in a published template', async () => {
    prismaMock.reviewerChecklistItem.findUnique.mockResolvedValue({
      id: 'item-1',
      section: { templateId: 'tpl-1' },
    })

    await expect(service.updateItem('item-1', { label: 'Changed' })).rejects.toMatchObject({
      code: 'TEMPLATE_PUBLISHED',
    })
    expect(prismaMock.reviewerChecklistItem.update).not.toHaveBeenCalled()
  })

  test('deleteSection blocks removing a published template section', async () => {
    prismaMock.reviewerChecklistSection.findUnique.mockResolvedValue({
      id: 'sec-1',
      templateId: 'tpl-1',
    })

    await expect(service.deleteSection('sec-1')).rejects.toMatchObject({
      code: 'TEMPLATE_PUBLISHED',
    })
    expect(prismaMock.reviewerChecklistReview.count).not.toHaveBeenCalled()
    expect(prismaMock.reviewerChecklistSection.delete).not.toHaveBeenCalled()
  })

  test('reorderItems blocks reordering items from a published template', async () => {
    prismaMock.reviewerChecklistItem.findMany.mockResolvedValue([
      { id: 'item-1', section: { templateId: 'tpl-1' } },
    ])

    await expect(service.reorderItems([{ id: 'item-1', orderIndex: 2 }])).rejects.toMatchObject({
      code: 'TEMPLATE_PUBLISHED',
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
})
