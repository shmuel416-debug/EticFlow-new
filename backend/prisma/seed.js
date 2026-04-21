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

const prisma = new PrismaClient()

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
    { email: 'researcher@test.com', fullName: 'ד"ר דנה כהן', role: 'RESEARCHER', department: 'ביולוגיה' },
    { email: 'secretary@test.com',  fullName: 'מיכל לוי',    role: 'SECRETARY',  department: 'מנהל' },
    { email: 'reviewer@test.com',   fullName: 'פרופ\' אבי גולן', role: 'REVIEWER', department: 'רפואה' },
    { email: 'chairman@test.com',   fullName: 'פרופ\' שרה מזרחי', role: 'CHAIRMAN', department: 'ועדת אתיקה' },
    { email: 'admin@test.com',      fullName: 'יוסי ברק',    role: 'ADMIN',      department: 'מערכות מידע' },
  ]

  const users = {}

  await prisma.$transaction(
    usersData.map((u) =>
      prisma.user.upsert({
        where:  { email: u.email },
        update: { passwordHash },
        create: {
          email:        u.email,
          passwordHash: passwordHash,
          fullName:     u.fullName,
          role:         u.role,
          department:   u.department,
          authProvider: 'LOCAL',
        },
      })
    )
  ).then((results) => {
    results.forEach((user) => {
      users[user.role] = user
    })
  })

  console.log(`     ✓ ${usersData.length} users upserted`)
  return users
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
  await seedInstitutionSettings()
  const form  = await seedFormConfig()
  await seedSubmissions(users, form)

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
