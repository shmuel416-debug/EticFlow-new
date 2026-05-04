/**
 * EthicFlow — status.service unit tests
 */

import { jest } from '@jest/globals'

const prismaMock = {
  submissionStatus: {
    findMany: jest.fn(),
  },
}

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: prismaMock,
}))

const statusService = await import('../src/services/status.service.js')

describe('status.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    statusService.invalidateStatusCache()
  })

  test('listStatuses loads active statuses from database', async () => {
    prismaMock.submissionStatus.findMany.mockResolvedValue([
      {
        code: 'SUBMITTED',
        labelHe: 'הוגש',
        labelEn: 'Submitted',
        color: '#2563eb',
        orderIndex: 20,
        isInitial: false,
        isTerminal: false,
        slaPhase: 'TRIAGE',
        notificationType: 'SUBMISSION_RECEIVED',
        isSystem: true,
        transitionsFrom: [],
        permissions: [],
      },
    ])

    const statuses = await statusService.listStatuses()
    expect(statuses).toHaveLength(1)
    expect(statuses[0].code).toBe('SUBMITTED')
  })

  test('getAllowedTransitions filters by role and reviewer requirement', async () => {
    prismaMock.submissionStatus.findMany.mockResolvedValue([
      {
        code: 'IN_TRIAGE',
        labelHe: 'בבדיקה ראשונית',
        labelEn: 'In Triage',
        color: '#ca8a04',
        orderIndex: 30,
        isInitial: false,
        isTerminal: false,
        slaPhase: 'TRIAGE',
        notificationType: null,
        isSystem: true,
        transitionsFrom: [
          {
            toStatus: { code: 'ASSIGNED' },
            allowedRoles: ['SECRETARY', 'ADMIN'],
            requireReviewerAssigned: true,
          },
        ],
        permissions: [],
      },
    ])

    const noReviewer = await statusService.getAllowedTransitions('IN_TRIAGE', 'SECRETARY', { reviewerId: null })
    const withReviewer = await statusService.getAllowedTransitions('IN_TRIAGE', 'SECRETARY', { reviewerId: 'reviewer-1' })

    expect(noReviewer.next).toHaveLength(0)
    expect(withReviewer.next).toEqual(['ASSIGNED'])
  })

  test('can() resolves role-action permissions', async () => {
    prismaMock.submissionStatus.findMany.mockResolvedValue([
      {
        code: 'ASSIGNED',
        labelHe: 'הוקצה לסוקר',
        labelEn: 'Assigned',
        color: '#ea580c',
        orderIndex: 40,
        isInitial: false,
        isTerminal: false,
        slaPhase: 'REVIEW',
        notificationType: 'SUBMISSION_ASSIGNED',
        isSystem: true,
        transitionsFrom: [],
        permissions: [
          { role: 'REVIEWER', action: 'SUBMIT_REVIEW', allowed: true },
          { role: 'REVIEWER', action: 'EDIT', allowed: false },
        ],
      },
    ])

    await statusService.listStatuses()
    expect(await statusService.can('SUBMIT_REVIEW', 'ASSIGNED', 'REVIEWER')).toBe(true)
    expect(await statusService.can('EDIT', 'ASSIGNED', 'REVIEWER')).toBe(false)
  })

  test('can() falls back to default permissions when migrated rows are missing', async () => {
    prismaMock.submissionStatus.findMany.mockResolvedValue([
      {
        code: 'IN_TRIAGE',
        labelHe: 'בבדיקה ראשונית',
        labelEn: 'In Triage',
        color: '#ca8a04',
        orderIndex: 30,
        isInitial: false,
        isTerminal: false,
        slaPhase: 'TRIAGE',
        notificationType: null,
        isSystem: true,
        transitionsFrom: [],
        permissions: [],
      },
    ])

    expect(await statusService.can('ASSIGN', 'IN_TRIAGE', 'SECRETARY')).toBe(true)
    expect(await statusService.can('ASSIGN', 'IN_TRIAGE', 'REVIEWER')).toBe(false)
  })

  test('can() preserves explicit deny rows over fallback defaults', async () => {
    prismaMock.submissionStatus.findMany.mockResolvedValue([
      {
        code: 'IN_TRIAGE',
        labelHe: 'בבדיקה ראשונית',
        labelEn: 'In Triage',
        color: '#ca8a04',
        orderIndex: 30,
        isInitial: false,
        isTerminal: false,
        slaPhase: 'TRIAGE',
        notificationType: null,
        isSystem: true,
        transitionsFrom: [],
        permissions: [
          { role: 'SECRETARY', action: 'ASSIGN', allowed: false },
        ],
      },
    ])

    expect(await statusService.can('ASSIGN', 'IN_TRIAGE', 'SECRETARY')).toBe(false)
  })

  test('isTransitionAllowed blocks when reviewer is required but missing', () => {
    const transition = {
      fromCode: 'IN_TRIAGE',
      toCode: 'ASSIGNED',
      allowedRoles: ['SECRETARY'],
      requireReviewerAssigned: true,
    }
    expect(statusService.isTransitionAllowed(transition, 'SECRETARY', { reviewerId: null })).toBe(false)
    expect(statusService.isTransitionAllowed(transition, 'SECRETARY', { reviewerId: 'rev-1' })).toBe(true)
  })
})
