/**
 * Reviewer checklist API — admin templates and (Phase 3+) reviewer workflow.
 */

import api from './api.js';

/**
 * List checklist templates with pagination.
 * @param {{ skip?: number, take?: number, isActive?: boolean }} [opts]
 * @returns {Promise<{ templates: object[], total: number, skip: number, take: number }>}
 */
export async function listTemplates(opts = {}) {
  const { skip = 0, take = 100, isActive } = opts;
  const params = new URLSearchParams({ skip: String(skip), take: String(take) });
  if (typeof isActive === 'boolean') {
    params.set('isActive', String(isActive));
  }
  const res = await api.get(`/checklists/templates?${params}`);
  return res.data;
}

/**
 * Fetch a single template with sections and items.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getTemplate(id) {
  const res = await api.get(`/checklists/templates/${id}`);
  return res.data.template;
}

/**
 * Create an empty draft template.
 * @param {{ name: string, nameEn: string, track?: string|null }} data
 * @returns {Promise<object>}
 */
export async function createTemplate(data) {
  const res = await api.post('/checklists/templates', data);
  return res.data.template;
}

/**
 * Update draft template metadata and/or replace all sections/items.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateTemplate(id, data) {
  const res = await api.put(`/checklists/templates/${id}`, data);
  return res.data.template;
}

/**
 * Publish a template (activates for its track; previous active for same track is deactivated).
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function publishTemplate(id) {
  const res = await api.post(`/checklists/templates/${id}/publish`);
  return res.data.template;
}
