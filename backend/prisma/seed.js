/**
 * EthicFlow — Database Seed File
 * Populates the database with initial test data for development.
 * Idempotent: safe to run multiple times (uses upsert).
 *
 * Users created:
 *   researcher@test.com / 123456 — RESEARCHER
 *   secretary@test.com  / 123456 — SECRETARY
 *   reviewer@test.com   / 123456 — REVIEWER
 *   chairman@test.com   / 123456 — CHAIRMAN
 *   admin@test.com      / 123456 — ADMIN
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getDefaultApprovalTemplate } from '../src/constants/approvalTemplate.js'
import { ACCESSIBILITY_STATEMENT_KEY, getDefaultAccessibilityStatement } from '../src/constants/accessibilityStatement.js'
import { seedResearcherQuestionnaire } from './seeds/researcher-questionnaire.seed.js'
import seedReviewerChecklist from './seeds/reviewer-checklist.seed.js'

const prisma = new PrismaClient()

const DEFAULT_SUBMISSION_STATUSES = [
  { code: 'DRAFT', labelHe: 'טיוטה', labelEn: 'Draft', descriptionHe: 'הבקשה נשמרה כטיוטה ועדיין לא נשלחה לבדיקה.', descriptionEn: 'The submission is saved as draft and has not been sent for review yet.', color: '#64748b', orderIndex: 10, isInitial: true, isTerminal: false, slaPhase: null, notificationType: null, isSystem: true },
  { code: 'SUBMITTED', labelHe: 'הוגש', labelEn: 'Submitted', descriptionHe: 'הבקשה התקבלה במערכת וממתינה לבדיקת מזכירת הוועדה.', descriptionEn: 'The submission was received and is waiting for secretary intake review.', color: '#2563eb', orderIndex: 20, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: 'SUBMISSION_RECEIVED', isSystem: true },
  { code: 'IN_TRIAGE', labelHe: 'בבדיקה ראשונית', labelEn: 'In Triage', descriptionHe: 'מבוצעת בדיקת שלמות מסמכים והתאמה לתהליך לפני הקצאה לסוקר.', descriptionEn: 'The request is being triaged for completeness before reviewer assignment.', color: '#ca8a04', orderIndex: 30, isInitial: false, isTerminal: false, slaPhase: 'TRIAGE', notificationType: null, isSystem: true },
  { code: 'ASSIGNED', labelHe: 'הוקצה לסוקר', labelEn: 'Assigned', descriptionHe: 'הבקשה הוקצתה לסוקר שמתחיל כעת בבדיקה מקצועית.', descriptionEn: 'A reviewer has been assigned and can now start the formal review.', color: '#ea580c', orderIndex: 40, isInitial: false, isTerminal: false, slaPhase: 'REVIEW', notificationType: 'SUBMISSION_ASSIGNED', isSystem: true },
  { code: 'IN_REVIEW', labelHe: 'בביקורת', labelEn: 'In Review', descriptionHe: 'הסקירה המקצועית הוגשה וממתינים להחלטת יו״ר הוועדה.', descriptionEn: 'The review is in progress or completed and awaiting chairman decision.', color: '#7c3aed', orderIndex: 50, isInitial: false, isTerminal: false, slaPhase: 'APPROVAL', notificationType: 'REVIEW_REQUESTED', isSystem: true },
  { code: 'PENDING_REVISION', labelHe: 'ממתין לתיקון', labelEn: 'Pending Revision', descriptionHe: 'נדרשים תיקונים מצד החוקר/ת לפני המשך הדיון בבקשה.', descriptionEn: 'The committee requested revisions before the process can continue.', color: '#dc2626', orderIndex: 60, isInitial: false, isTerminal: false, slaPhase: null, notificationType: 'REVISION_REQUIRED', isSystem: true },
  { code: 'APPROVED', labelHe: 'אושר', labelEn: 'Approved', descriptionHe: 'הבקשה אושרה סופית על ידי הוועדה.', descriptionEn: 'The submission has been formally approved by the committee.', color: '#16a34a', orderIndex: 70, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'APPROVED', isSystem: true },
  { code: 'REJECTED', labelHe: 'נדחה', labelEn: 'Rejected', descriptionHe: 'הבקשה נדחתה וההליך נסגר ללא אישור.', descriptionEn: 'The submission was rejected and the review workflow is closed.', color: '#b91c1c', orderIndex: 80, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: 'REJECTED', isSystem: true },
  { code: 'WITHDRAWN', labelHe: 'בוטל', labelEn: 'Withdrawn', descriptionHe: 'הבקשה בוטלה על ידי החוקר/ת או המזכירות.', descriptionEn: 'The submission was withdrawn by the researcher or secretary.', color: '#6b7280', orderIndex: 90, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null, isSystem: true },
  { code: 'CONTINUED', labelHe: 'המשך', labelEn: 'Continued', descriptionHe: 'הבקשה הועברה להמשך טיפול בתהליך נפרד.', descriptionEn: 'The submission was marked for continuation in a separate process.', color: '#0d9488', orderIndex: 100, isInitial: false, isTerminal: true, slaPhase: 'COMPLETED', notificationType: null, isSystem: true },
]

const DEFAULT_TRANSITIONS = [
  { fromCode: 'DRAFT', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'SUBMITTED', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'SUBMITTED', toCode: 'IN_TRIAGE', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_TRIAGE', toCode: 'WITHDRAWN', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_TRIAGE', toCode: 'ASSIGNED', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'ASSIGNED', toCode: 'WITHDRAWN', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'ASSIGNED', toCode: 'IN_REVIEW', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: true },
  { fromCode: 'IN_REVIEW', toCode: 'APPROVED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'REJECTED', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'IN_REVIEW', toCode: 'PENDING_REVISION', allowedRoles: ['CHAIRMAN', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'PENDING_REVISION', toCode: 'WITHDRAWN', allowedRoles: ['RESEARCHER', 'SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
  { fromCode: 'PENDING_REVISION', toCode: 'SUBMITTED', allowedRoles: ['SECRETARY', 'ADMIN'], requireReviewerAssigned: false },
]

const STATUS_ACTIONS = ['VIEW', 'EDIT', 'COMMENT', 'UPLOAD_DOC', 'DELETE_DOC', 'VIEW_INTERNAL', 'TRANSITION', 'ASSIGN', 'SUBMIT_REVIEW', 'RECORD_DECISION']
const ROLES = ['RESEARCHER', 'SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN']

/**
 * Returns a primary display role for role arrays.
 * @param {string[]} roles
 * @returns {string}
 */
function getPrimaryRole(roles) {
  return roles.find((role) => role !== 'RESEARCHER') ?? 'RESEARCHER'
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Bcrypt hash
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

// ─────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Seeds 5 test users, one per role.
 * @returns {Promise<Object>} Map of role → user record
 */
async function seedUsers() {
  console.log('  → Seeding users...')

  const passwordHash = await hashPassword('123456')

  const usersData = [
    { email: 'researcher@test.com', fullName: 'ד"ר דנה כהן', roles: ['RESEARCHER'], department: 'ביולוגיה' },
    { email: 'secretary@test.com',  fullName: 'מיכל לוי',    roles: ['RESEARCHER', 'SECRETARY'],  department: 'מנהל' },
    { email: 'reviewer@test.com',   fullName: 'פרופ\' אבי גולן', roles: ['RESEARCHER', 'REVIEWER'], department: 'רפואה' },
    { email: 'chairman@test.com',   fullName: 'פרופ\' שרה מזרחי', roles: ['RESEARCHER', 'CHAIRMAN'], department: 'ועדת אתיקה' },
    { email: 'admin@test.com',      fullName: 'יוסי ברק',    roles: ['RESEARCHER', 'ADMIN'],      department: 'מערכות מידע' },
  ]

  const users = {}

  await prisma.$transaction(
    usersData.map((u) =>
      prisma.user.upsert({
        where:  { email: u.email },
        update: { passwordHash, roles: u.roles },
        create: {
          email:        u.email,
          passwordHash: passwordHash,
          fullName:     u.fullName,
          roles:        u.roles,
          department:   u.department,
          authProvider: 'LOCAL',
        },
      })
    )
  ).then((results) => {
    results.forEach((user) => {
      const primaryRole = getPrimaryRole(user.roles)
      users[primaryRole] = user
      if (user.roles.includes('RESEARCHER') && !users.RESEARCHER) {
        users.RESEARCHER = user
      }
    })
  })

  console.log(`     ✓ ${usersData.length} users upserted`)
  return users
}

/**
 * Seeds configurable submission statuses, transitions, and permissions.
 * @returns {Promise<void>}
 */
async function seedStatusManagement() {
  console.log('  → Seeding status management...')

  for (const status of DEFAULT_SUBMISSION_STATUSES) {
    await prisma.submissionStatus.upsert({
      where: { code: status.code },
      update: {
        labelHe: status.labelHe,
        labelEn: status.labelEn,
        descriptionHe: status.descriptionHe,
        descriptionEn: status.descriptionEn,
        color: status.color,
        orderIndex: status.orderIndex,
        isInitial: status.isInitial,
        isTerminal: status.isTerminal,
        slaPhase: status.slaPhase,
        notificationType: status.notificationType,
        isSystem: status.isSystem,
        isActive: true,
      },
      create: status,
    })
  }

  const statusRows = await prisma.submissionStatus.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  })
  const statusIdByCode = Object.fromEntries(statusRows.map((item) => [item.code, item.id]))

  for (const transition of DEFAULT_TRANSITIONS) {
    const fromStatusId = statusIdByCode[transition.fromCode]
    const toStatusId = statusIdByCode[transition.toCode]
    if (!fromStatusId || !toStatusId) continue

    await prisma.statusTransition.upsert({
      where: { fromStatusId_toStatusId: { fromStatusId, toStatusId } },
      update: {
        allowedRoles: transition.allowedRoles,
        requireReviewerAssigned: transition.requireReviewerAssigned,
        isActive: true,
      },
      create: {
        fromStatusId,
        toStatusId,
        allowedRoles: transition.allowedRoles,
        requireReviewerAssigned: transition.requireReviewerAssigned,
      },
    })
  }

  for (const status of statusRows) {
    for (const role of ROLES) {
      for (const action of STATUS_ACTIONS) {
        const allowed =
          action === 'VIEW'
            ? true
            : action === 'EDIT'
              ? role === 'ADMIN' || role === 'SECRETARY' || (role === 'RESEARCHER' && ['DRAFT', 'PENDING_REVISION'].includes(status.code))
              : action === 'COMMENT'
                ? ['SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'].includes(role)
                : action === 'UPLOAD_DOC'
                  ? role === 'ADMIN' || role === 'SECRETARY' || (role === 'RESEARCHER' && ['DRAFT', 'SUBMITTED', 'PENDING_REVISION'].includes(status.code))
                  : action === 'DELETE_DOC'
                    ? role === 'ADMIN' || role === 'SECRETARY' || (role === 'RESEARCHER' && ['DRAFT', 'SUBMITTED', 'PENDING_REVISION'].includes(status.code))
                    : action === 'VIEW_INTERNAL'
                      ? ['SECRETARY', 'REVIEWER', 'CHAIRMAN', 'ADMIN'].includes(role)
                      : action === 'TRANSITION'
                        ? (['SUBMITTED', 'IN_TRIAGE', 'ASSIGNED', 'PENDING_REVISION'].includes(status.code) && ['SECRETARY', 'ADMIN'].includes(role))
                          || (status.code === 'IN_REVIEW' && ['CHAIRMAN', 'ADMIN'].includes(role))
                        : action === 'ASSIGN'
                          ? ['SECRETARY', 'ADMIN'].includes(role) && ['IN_TRIAGE', 'ASSIGNED'].includes(status.code)
                          : action === 'SUBMIT_REVIEW'
                            ? role === 'REVIEWER' && status.code === 'ASSIGNED'
                            : action === 'RECORD_DECISION'
                              ? ['CHAIRMAN', 'ADMIN'].includes(role) && status.code === 'IN_REVIEW'
                              : false

        await prisma.statusPermission.upsert({
          where: {
            statusId_role_action: {
              statusId: status.id,
              role,
              action,
            },
          },
          update: { allowed, isActive: true },
          create: {
            statusId: status.id,
            role,
            action,
            allowed,
          },
        })
      }
    }
  }

  console.log(`     ✓ ${DEFAULT_SUBMISSION_STATUSES.length} statuses upserted`)
  console.log(`     ✓ ${DEFAULT_TRANSITIONS.length} transitions upserted`)
}

/**
 * Seeds institution settings as key-value pairs.
 * @returns {Promise<void>}
 */
async function seedInstitutionSettings() {
  console.log('  → Seeding institution settings...')

  const settings = [
    { key: 'institution_name_he', value: 'ועדת האתיקה',      valueType: 'string' },
    { key: 'institution_name_en', value: 'Ethics Committee',  valueType: 'string' },
    { key: 'sla_triage_days',     value: '3',                 valueType: 'number' },
    { key: 'sla_review_days',     value: '14',                valueType: 'number' },
    { key: 'sla_revision_days',   value: '30',                valueType: 'number' },
    { key: 'sla_approval_days',   value: '5',                 valueType: 'number' },
    { key: 'sla_holidays',        value: '[]',                valueType: 'json' },
    { key: 'timezone',            value: 'Asia/Jerusalem',    valueType: 'string' },
    { key: 'decision_model',      value: 'IRB_FULL',          valueType: 'string' },
    { key: 'committee_quorum_min_votes', value: '3',          valueType: 'number' },
    { key: 'continuing_review_reminder_days', value: '30',     valueType: 'number' },
    {
      key: 'approval_template_he',
      value: JSON.stringify(getDefaultApprovalTemplate('he')),
      valueType: 'json',
    },
    {
      key: 'approval_template_en',
      value: JSON.stringify(getDefaultApprovalTemplate('en')),
      valueType: 'json',
    },
    {
      key: 'approval_template_history_he',
      value: '[]',
      valueType: 'json',
    },
    {
      key: 'approval_template_history_en',
      value: '[]',
      valueType: 'json',
    },
    {
      key: 'approval_chairman_signature',
      value: '',
      valueType: 'string',
    },
    {
      key: ACCESSIBILITY_STATEMENT_KEY,
      value: JSON.stringify(getDefaultAccessibilityStatement()),
      valueType: 'json',
    },
  ]

  await prisma.$transaction(
    settings.map((s) =>
      prisma.institutionSetting.upsert({
        where:  { key: s.key },
        update: { value: s.value },
        create: s,
      })
    )
  )

  console.log(`     ✓ ${settings.length} settings upserted`)
}

/**
 * Seeds one published form config with a basic research application schema.
 * @returns {Promise<Object>} The created FormConfig record
 */
async function seedFormConfig() {
  console.log('  → Seeding form config...')

  const schemaJson = {
    version: 1,
    fields: [
      {
        id:       'researchTitle',
        type:     'text',
        labelHe:  'כותרת המחקר',
        labelEn:  'Research Title',
        required: true,
        validation: { maxLength: 200 },
      },
      {
        id:       'researchType',
        type:     'select',
        labelHe:  'סוג המחקר',
        labelEn:  'Research Type',
        required: true,
        options: [
          { value: 'clinical',    labelHe: 'קליני',     labelEn: 'Clinical' },
          { value: 'behavioral',  labelHe: 'התנהגותי',  labelEn: 'Behavioral' },
          { value: 'survey',      labelHe: 'סקר',       labelEn: 'Survey' },
        ],
      },
      {
        id:       'startDate',
        type:     'date',
        labelHe:  'תאריך תחילת המחקר',
        labelEn:  'Research Start Date',
        required: true,
      },
      {
        id:       'description',
        type:     'textarea',
        labelHe:  'תיאור המחקר',
        labelEn:  'Research Description',
        required: true,
        validation: { minLength: 50, maxLength: 5000 },
      },
      {
        id:       'gcpCertificate',
        type:     'file',
        labelHe:  'תעודת GCP',
        labelEn:  'GCP Certificate',
        required: false,
        accept:   ['pdf', 'jpg', 'png'],
      },
    ],
  }

  const form = await prisma.formConfig.upsert({
    where:  { id: 'seed-form-v1' },
    update: { schemaJson },
    create: {
      id:          'seed-form-v1',
      name:        'טופס בקשה לאישור מחקר',
      nameEn:      'Research Approval Application',
      version:     1,
      schemaJson,
      isActive:    true,
      isPublished: true,
      publishedAt: new Date(),
    },
  })

  console.log('     ✓ Form config upserted')
  return form
}

/**
 * Seeds 3 sample submissions in different statuses.
 * @param {Object} users - Map of role → user record
 * @param {Object} form  - The FormConfig record
 * @returns {Promise<void>}
 */
async function seedSubmissions(users, form) {
  console.log('  → Seeding submissions...')

  const researcher = users['RESEARCHER']
  const reviewer   = users['REVIEWER']

  const submissionsData = [
    {
      id:            'seed-sub-001',
      applicationId: 'ETH-2026-001',
      title:         'מחקר על תגובות חיסון',
      track:         'FULL',
      status:        'SUBMITTED',
      reviewerId:    null,
      submittedAt:   new Date('2026-03-01'),
      dataJson: {
        researchTitle: 'מחקר על תגובות חיסון',
        researchType:  'clinical',
        startDate:     '2026-04-01',
        description:   'מחקר קליני לבדיקת תגובות חיסון בקרב מתנדבים בריאים בגילאי 18-65.',
      },
    },
    {
      id:            'seed-sub-002',
      applicationId: 'ETH-2026-002',
      title:         'בדיקת תרופה ניסיונית',
      track:         'FULL',
      status:        'IN_REVIEW',
      reviewerId:    reviewer.id,
      submittedAt:   new Date('2026-02-15'),
      dataJson: {
        researchTitle: 'בדיקת תרופה ניסיונית',
        researchType:  'clinical',
        startDate:     '2026-03-15',
        description:   'ניסוי קליני שלב II לבדיקת יעילות ובטיחות תרופה ניסיונית לטיפול בסוכרת סוג 2.',
      },
    },
    {
      id:            'seed-sub-003',
      applicationId: 'ETH-2026-003',
      title:         'סקר עמדות סטודנטים',
      track:         'EXEMPT',
      status:        'APPROVED',
      reviewerId:    reviewer.id,
      submittedAt:   new Date('2026-01-10'),
      dataJson: {
        researchTitle: 'סקר עמדות סטודנטים',
        researchType:  'survey',
        startDate:     '2026-02-01',
        description:   'סקר אנונימי לבדיקת עמדות סטודנטים כלפי שיטות הוראה דיגיטליות באוניברסיטה.',
      },
    },
  ]

  for (const sub of submissionsData) {
    const { dataJson, ...subFields } = sub

    await prisma.$transaction(async (tx) => {
      const created = await tx.submission.upsert({
        where:  { id: sub.id },
        update: {},
        create: {
          ...subFields,
          authorId:     researcher.id,
          formConfigId: form.id,
        },
      })

      // Create version 1 snapshot
      await tx.submissionVersion.upsert({
        where:  { submissionId_versionNum: { submissionId: created.id, versionNum: 1 } },
        update: {},
        create: {
          submissionId: created.id,
          versionNum:   1,
          dataJson,
          changedBy:    researcher.id,
          changeNote:   'Initial submission',
        },
      })
    })
  }

  console.log(`     ✓ ${submissionsData.length} submissions upserted`)
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

/**
 * Main seed entry point. Runs all seed functions in order.
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🌱 Starting EthicFlow seed...')

  const users = await seedUsers()
  await seedStatusManagement()
  await seedInstitutionSettings()
  const form  = await seedFormConfig()
  await seedSubmissions(users, form)
  await seedResearcherQuestionnaire()
  await seedReviewerChecklist()

  console.log('✅ Seed complete!')
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
