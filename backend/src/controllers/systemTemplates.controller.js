/**
 * System Templates Controller
 * Handles template download, upload, versioning, and rollback
 */

import * as systemTemplateService from '../services/systemTemplate.service.js';
import { storage } from '../services/storage.service.js';
import { AppError } from '../middleware/error.js';
import z from 'zod';

const ALLOWED_KEYS = ['questionnaire_preface'];

/**
 * GET /api/system-templates/:key/active
 * Retrieve active template metadata for a key+lang
 * Query: ?lang=he (default: he)
 */
export async function getActive(req, res, next) {
  try {
    const { key } = req.params;
    const lang = req.query.lang || 'he';

    const template = await systemTemplateService.getActive(key, lang);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    res.json({
      id: template.id,
      key: template.key,
      lang: template.lang,
      version: template.version,
      filename: template.filename,
      mimeType: template.mimeType,
      size: template.size,
      uploadedBy: template.uploader.fullName,
      createdAt: template.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/system-templates/:key/download
 * Download a template file
 * Query: ?lang=he
 */
export async function download(req, res, next) {
  try {
    const { key } = req.params;
    const lang = req.query.lang || 'he';

    const template = await systemTemplateService.getActive(key, lang);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    const buffer = await storage.retrieve(template.storagePath);
    const ext = template.mimeType === 'application/pdf' ? 'pdf' : 'docx';
    const filename = `${key}-${lang}-v${template.version}.${ext}`;

    res.setHeader('Content-Type', template.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/system-templates
 * List all templates grouped by key (ADMIN ONLY)
 */
export async function listAll(req, res, next) {
  try {
    const grouped = await systemTemplateService.listAll();
    res.json(grouped);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/system-templates/:key/versions
 * List all versions of a template (ADMIN ONLY)
 */
export async function listVersions(req, res, next) {
  try {
    const { key } = req.params;

    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'Invalid template key',
        code: 'INVALID_TEMPLATE_KEY',
      });
    }

    const versions = await systemTemplateService.listVersions(key);

    res.json(
      versions.map((v) => ({
        id: v.id,
        key: v.key,
        lang: v.lang,
        version: v.version,
        filename: v.filename,
        size: v.size,
        isActive: v.isActive,
        uploadedBy: v.uploader.fullName,
        createdAt: v.createdAt,
      }))
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/system-templates/:key/upload
 * Upload a new version (ADMIN ONLY, multipart)
 * Body: key (path), lang (form), file (binary)
 */
export async function upload(req, res, next) {
  try {
    const { key } = req.params;
    const { lang } = req.body;

    // Validate
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'Invalid template key',
        code: 'INVALID_TEMPLATE_KEY',
      });
    }

    if (!['he', 'en'].includes(lang)) {
      return res.status(400).json({
        error: 'Language must be "he" or "en"',
        code: 'INVALID_LANGUAGE',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        code: 'MISSING_FILE',
      });
    }

    const template = await systemTemplateService.uploadNewVersion(
      key,
      lang,
      req.file,
      req.user.id
    );

    res.status(201).json({
      id: template.id,
      key: template.key,
      lang: template.lang,
      version: template.version,
      filename: template.filename,
      size: template.size,
      uploadedBy: template.uploader.fullName,
      createdAt: template.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/system-templates/:key/rollback
 * Restore a previous version (ADMIN ONLY)
 * Body: { lang, version }
 */
export async function rollback(req, res, next) {
  try {
    const { key } = req.params;
    const { lang, version } = req.body;

    // Validate
    const rollbackSchema = z.object({
      lang: z.enum(['he', 'en']),
      version: z.number().int().positive(),
    });

    const validation = rollbackSchema.safeParse({ lang, version });
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input',
        code: 'INVALID_INPUT',
        details: validation.error.errors,
      });
    }

    const restored = await systemTemplateService.rollbackToVersion(
      key,
      lang,
      version
    );

    res.json({
      id: restored.id,
      key: restored.key,
      lang: restored.lang,
      version: restored.version,
      filename: restored.filename,
      isActive: restored.isActive,
      uploadedBy: restored.uploader.fullName,
      createdAt: restored.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/system-templates/:key/archive
 * Archive a template (ADMIN ONLY)
 * Body: { lang }
 */
export async function archive(req, res, next) {
  try {
    const { key } = req.params;
    const { lang } = req.body;

    // Validate
    if (!['he', 'en'].includes(lang)) {
      return res.status(400).json({
        error: 'Language must be "he" or "en"',
        code: 'INVALID_LANGUAGE',
      });
    }

    await systemTemplateService.archiveTemplate(key, lang);

    res.json({ success: true, message: 'Template archived' });
  } catch (error) {
    next(error);
  }
}
