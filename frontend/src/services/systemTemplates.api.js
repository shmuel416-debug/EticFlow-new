/**
 * System Templates API Service
 * Client-side API calls for template download, upload, and management
 */

import api, { getApiBaseUrl } from './api.js';

/**
 * Get metadata for an active template
 * @param {string} key - Template key (e.g., 'questionnaire_preface')
 * @param {string} lang - Language ('he' or 'en')
 * @returns {object} Template metadata
 */
export async function getActiveTemplate(key, lang = 'he') {
  const { data } = await api.get(`/system-templates/${key}/active`, {
    params: { lang },
  });
  return data;
}

/**
 * Download a template file
 * @param {string} key - Template key
 * @param {string} lang - Language ('he' or 'en')
 * @returns {blob} File blob
 */
export async function downloadTemplate(key, lang = 'he') {
  const { data } = await api.get(`/system-templates/${key}/download`, {
    params: { lang },
    responseType: 'blob',
  });
  return data;
}

/**
 * Build the inline-preview URL for a template (for iframe/image embedding).
 * Relies on cookie-based auth (sent automatically by the browser).
 * @param {string} key - Template key
 * @param {string} lang - Language ('he' or 'en')
 * @returns {string} Absolute preview URL
 */
export function getPreviewUrl(key, lang = 'he') {
  return `${getApiBaseUrl()}/system-templates/${key}/preview?lang=${encodeURIComponent(lang)}`;
}

/**
 * List all versions of a template (ADMIN)
 * @param {string} key
 * @returns {array} Versions
 */
export async function listVersions(key) {
  const { data } = await api.get(`/system-templates/admin/${key}/versions`);
  return data;
}

/**
 * List all templates (ADMIN)
 * @returns {object} Templates grouped by key
 */
export async function listAllTemplates() {
  const { data } = await api.get('/system-templates/admin/all');
  return data;
}

/**
 * Upload a new template version (ADMIN)
 * @param {string} key
 * @param {string} lang
 * @param {File} file
 * @returns {object} Created template metadata
 */
export async function uploadTemplate(key, lang, file) {
  const formData = new FormData();
  formData.append('lang', lang);
  formData.append('file', file);

  const { data } = await api.post(`/system-templates/admin/${key}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Rollback to a previous version (ADMIN)
 * @param {string} key
 * @param {string} lang
 * @param {number} version
 * @returns {object} Restored template metadata
 */
export async function rollbackTemplate(key, lang, version) {
  const { data } = await api.post(`/system-templates/admin/${key}/rollback`, {
    lang,
    version,
  });
  return data;
}

/**
 * Archive a template (ADMIN)
 * @param {string} key
 * @param {string} lang
 */
export async function archiveTemplate(key, lang) {
  const { data } = await api.post(`/system-templates/admin/${key}/archive`, {
    lang,
  });
  return data;
}
