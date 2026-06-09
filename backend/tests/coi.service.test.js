/**
 * Ethic-Net — COI service unit tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submission: {
    findFirst: jest.fn(),
  },
  conflictDeclaration: {
    findMany: jest.fn(),
  },
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

const { hasConflict, buildReviewerConflictExclusion } = await import('../src/services/coi.service.js')

describe('coi.service hasConflict', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('blocks self review', async () => {
    const submission = { id: 's1', authorId: 'u1', author: { department: 'Med' } }
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([])
    const result = await hasConflict('u1', submission)
    expect(result.conflict).toBe(true)
    expect(result.reasons.some((item) => item.code === 'SELF_REVIEW_BLOCKED')).toBe(true)
  })

  test('blocks submission-scope declaration', async () => {
    const submission = { id: 's1', authorId: 'u2', author: { department: 'Med' } }
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'SUBMISSION', targetSubmissionId: 's1', reason: 'direct conflict' },
    ])
    const result = await hasConflict('u1', submission)
    expect(result.conflict).toBe(true)
    expect(result.reasons.some((item) => item.code === 'SUBMISSION_DECLARATION')).toBe(true)
  })

  test('blocks user-scope declaration', async () => {
    const submission = { id: 's1', authorId: 'author-1', author: { department: 'Med' } }
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'USER', targetUserId: 'author-1', reason: 'prior collaboration' },
    ])
    const result = await hasConflict('u1', submission)
    expect(result.conflict).toBe(true)
    expect(result.reasons.some((item) => item.code === 'USER_DECLARATION')).toBe(true)
  })

  test('blocks department declaration and ignores inactive match absence', async () => {
    const submission = { id: 's1', authorId: 'u9', author: { department: 'Psychology' } }
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'DEPARTMENT', targetDepartment: 'Psychology', reason: 'same department' },
    ])
    const result = await hasConflict('u1', submission)
    expect(result.conflict).toBe(true)
    expect(result.reasons.some((item) => item.code === 'DEPARTMENT_DECLARATION')).toBe(true)
  })

  test('passes when no matching declarations', async () => {
    const submission = { id: 's1', authorId: 'u2', author: { department: 'Med' } }
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'SUBMISSION', targetSubmissionId: 'other', reason: 'other submission' },
    ])
    const result = await hasConflict('u1', submission)
    expect(result.conflict).toBe(false)
    expect(result.reasons).toHaveLength(0)
  })
})

describe('coi.service buildReviewerConflictExclusion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('maps active declarations into exclusion buckets', async () => {
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'SUBMISSION', targetSubmissionId: 'sub-1' },
      { scope: 'USER', targetUserId: 'author-1' },
      { scope: 'DEPARTMENT', targetDepartment: 'Medicine' },
    ])

    const result = await buildReviewerConflictExclusion('rev-1')
    expect(result).toEqual({
      blockAll: false,
      submissionIds: ['sub-1'],
      userIds: ['rev-1', 'author-1'],
      departments: ['medicine'],
    })
  })

  test('returns blockAll for global declarations', async () => {
    prismaMock.conflictDeclaration.findMany.mockResolvedValue([
      { scope: 'GLOBAL' },
    ])

    const result = await buildReviewerConflictExclusion('rev-1')
    expect(result.blockAll).toBe(true)
    expect(result.userIds).toEqual(['rev-1'])
  })
})
