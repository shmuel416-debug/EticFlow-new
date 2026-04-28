/**
 * System Template Service
 * Manages versioned system templates (questionnaire preface, consent forms, etc.)
 * Supports upload, retrieval, version history, and rollback
 */

import { prisma } from '../db/index.js';
import { storage } from './storage.service.js';
import { AppError } from '../middleware/error.js';

const ALLOWED_KEYS = ['questionnaire_preface'];
const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Get active template for a key+lang combination
 * @param {string} key - Template key (e.g., 'questionnaire_preface')
 * @param {string} lang - Language code ('he' or 'en')
 * @returns {object|null} Template metadata + storagePath, or null if not found
 */
export async function getActive(key, lang) {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Template key not found', 'INVALID_TEMPLATE_KEY', 404);
  }

  const template = await prisma.systemTemplate.findFirst({
    where: { key, lang, isActive: true },
    orderBy: { version: 'desc' },
    include: { uploader: { select: { fullName: true } } },
  });

  return template;
}

/**
 * List all versions of a template (with pagination)
 * @param {string} key
 * @returns {array} All versions (active + archived)
 */
export async function listVersions(key) {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Template key not found', 'INVALID_TEMPLATE_KEY', 404);
  }

  return await prisma.systemTemplate.findMany({
    where: { key },
    orderBy: [{ lang: 'asc' }, { version: 'desc' }],
    include: { uploader: { select: { fullName: true } } },
  });
}

/**
 * List all templates (admin view)
 * @returns {array} Grouped by key, with active status
 */
export async function listAll() {
  const templates = await prisma.systemTemplate.findMany({
    orderBy: [{ key: 'asc' }, { lang: 'asc' }, { version: 'desc' }],
    include: { uploader: { select: { fullName: true } } },
  });

  // Group by key for display
  const grouped = {};
  for (const tpl of templates) {
    if (!grouped[tpl.key]) grouped[tpl.key] = [];
    grouped[tpl.key].push(tpl);
  }

  return grouped;
}

/**
 * Upload a new version of a template
 * @param {string} key - Template key
 * @param {string} lang - Language code
 * @param {object} file - Multer file object { originalname, buffer, mimetype, size }
 * @param {string} userId - User uploading
 * @returns {object} Created template record
 */
export async function uploadNewVersion(key, lang, file, userId) {
  // Validate key
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Template key not allowed', 'INVALID_TEMPLATE_KEY', 400);
  }

  // Validate language
  if (!['he', 'en'].includes(lang)) {
    throw new AppError('Language must be "he" or "en"', 'INVALID_LANGUAGE', 400);
  }

  // Validate file
  if (!file) {
    throw new AppError('No file provided', 'MISSING_FILE', 400);
  }

  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new AppError(
      'Invalid file type. Use PDF or DOCX only.',
      'INVALID_MIME',
      400
    );
  }

  if (file.size > MAX_SIZE) {
    throw new AppError(
      `File size exceeds ${MAX_SIZE / 1024 / 1024}MB limit`,
      'FILE_TOO_LARGE',
      400
    );
  }

  // Find next version number for this key+lang
  const lastVersion = await prisma.systemTemplate.findFirst({
    where: { key, lang },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Deactivate previous active version for this key+lang
  await prisma.systemTemplate.updateMany({
    where: { key, lang, isActive: true },
    data: { isActive: false },
  });

  // Save file to storage
  const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'docx';
  const storagePath = `templates/${key}/v${nextVersion}/${lang}.${ext}`;

  await storage.save(storagePath, file.buffer, file.mimetype);

  // Create database record
  const template = await prisma.systemTemplate.create({
    data: {
      key,
      lang,
      version: nextVersion,
      filename: file.originalname,
      storagePath,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: userId,
      isActive: true,
    },
    include: { uploader: { select: { fullName: true } } },
  });

  // Defensive check: user could be deleted mid-upload (race condition)
  if (!template.uploader) {
    throw new AppError('Uploader user not found', 'UPLOADER_NOT_FOUND', 500);
  }

  return template;
}

/**
 * Rollback to a specific version
 * @param {string} key
 * @param {string} lang
 * @param {number} version - Version number to restore
 */
export async function rollbackToVersion(key, lang, version) {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Template key not found', 'INVALID_TEMPLATE_KEY', 404);
  }

  const target = await prisma.systemTemplate.findUnique({
    where: { key_lang_version: { key, lang, version } },
  });

  if (!target) {
    throw new AppError('Version not found', 'VERSION_NOT_FOUND', 404);
  }

  // Deactivate current active version
  await prisma.systemTemplate.updateMany({
    where: { key, lang, isActive: true },
    data: { isActive: false },
  });

  // Activate target version
  const restored = await prisma.systemTemplate.update({
    where: { id: target.id },
    data: { isActive: true },
    include: { uploader: { select: { fullName: true } } },
  });

  return restored;
}

/**
 * Archive a template (mark as inactive without replacement)
 * @param {string} key
 * @param {string} lang
 */
export async function archiveTemplate(key, lang) {
  if (!ALLOWED_KEYS.includes(key)) {
    throw new AppError('Template key not found', 'INVALID_TEMPLATE_KEY', 404);
  }

  return await prisma.systemTemplate.updateMany({
    where: { key, lang, isActive: true },
    data: { isActive: false },
  });
}
