/**
 * System Template Service
 * Manages versioned system templates (questionnaire preface, consent forms, etc.)
 * Supports upload, retrieval, version history, and rollback
 */

import { prisma } from '../db/index.js';
import { storage } from './storage.service.js';
import { AppError } from '../middleware/error.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ALLOWED_KEYS = ['questionnaire_preface'];
// System-provided documents are PDF only — guarantees in-browser preview.
const ALLOWED_MIMES = ['application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
// Portable, repo-bundled PDF blank-with-logo used as the default fallback.
const DEFAULT_QUESTIONNAIRE_PREFACE_PATH = path.resolve(
  MODULE_DIR,
  '../../assets/letterhead/default-letterhead.pdf'
);

/**
 * Resolves an optional filesystem fallback path for a template key+lang.
 * @param {string} key
 * @param {string} lang
 * @returns {string|null}
 */
function resolveFallbackPath(key, lang) {
  if (key !== 'questionnaire_preface') return null;
  const upperKey = key.toUpperCase();
  const upperLang = String(lang || 'he').toUpperCase();
  const langSpecific = process.env[`SYSTEM_TEMPLATE_${upperKey}_${upperLang}_PATH`];
  const keySpecific = process.env[`SYSTEM_TEMPLATE_${upperKey}_PATH`];
  const generic = process.env.SYSTEM_TEMPLATE_FALLBACK_DOCX_PATH;
  const defaultPath = DEFAULT_QUESTIONNAIRE_PREFACE_PATH;
  const resolved = langSpecific || keySpecific || generic || defaultPath;
  return resolved ? String(resolved).trim() : null;
}

/**
 * Infers MIME type from a fallback file path.
 * @param {string} filePath
 * @returns {string}
 */
function inferMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

/**
 * Loads a filesystem fallback template when DB does not contain an active row.
 * @param {string} key
 * @param {string} lang
 * @returns {Promise<object|null>}
 */
async function getFilesystemFallbackTemplate(key, lang) {
  const localPath = resolveFallbackPath(key, lang);
  if (!localPath) return null;
  try {
    const stat = await fs.stat(localPath);
    if (!stat.isFile()) return null;
    return {
      id: `fallback-${key}-${lang}`,
      key,
      lang,
      version: 0,
      filename: path.basename(localPath),
      storagePath: null,
      mimeType: inferMimeType(localPath),
      size: stat.size,
      isActive: true,
      createdAt: stat.mtime,
      updatedAt: stat.mtime,
      uploader: { fullName: 'System fallback' },
      localPath,
      isFallback: true,
    };
  } catch {
    return null;
  }
}

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

  let template = null;
  try {
    template = await prisma.systemTemplate.findFirst({
      where: { key, lang, isActive: true },
      orderBy: { version: 'desc' },
      include: { uploader: { select: { fullName: true } } },
    });
  } catch {
    // Ignore DB connectivity/auth failures and continue with filesystem fallback.
  }

  if (template) return template;
  return getFilesystemFallbackTemplate(key, lang);
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
      'Invalid file type. Use PDF only.',
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

  // Save file to storage (PDF only)
  const storagePath = `templates/${key}/v${nextVersion}/${lang}.pdf`;

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
