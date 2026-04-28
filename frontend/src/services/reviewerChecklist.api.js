/**
 * Reviewer checklist API — admin templates and reviewer workflow.
 */

import api from './api.js';

/**
 * List checklist templates with pagination.
 * @param {{ skip?: number, take?: number, isActive?: boolean }} [opts]
 * @returns {Promise<{ templates: object[] }>}
 */
export async function listTemplates(opts = {}) {
  const { isActive } = opts;
  const params = new URLSearchParams();
  if (typeof isActive === 'boolean') {
    params.set('isActive', String(isActive));
  }
  const suffix = params.size ? `?${params.toString()}` : '';
  const res = await api.get(`/reviewer-checklist/templates${suffix}`);
  return { templates: res.data?.data ?? [] };
}

/**
 * Fetch a single template with sections and items.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getTemplate(id) {
  const res = await api.get(`/reviewer-checklist/templates/${id}`);
  return res.data?.data;
}

/**
 * Create an empty draft template.
 * @param {{ name: string, nameEn: string, track?: string|null }} data
 * @returns {Promise<object>}
 */
export async function createTemplate(data) {
  const res = await api.post('/reviewer-checklist/templates', data);
  return res.data?.data;
}

/**
 * Update draft template metadata and/or replace all sections/items.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateTemplate(id, data) {
  const res = await api.put(`/reviewer-checklist/templates/${id}`, data);
  return res.data?.data;
}

/**
 * Publish a template (activates for its track; previous active for same track is deactivated).
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function publishTemplate(id) {
  const res = await api.post(`/reviewer-checklist/templates/${id}/publish`);
  return res.data?.data;
}

/**
 * Load reviewer checklist payload for one submission.
 * @param {string} submissionId
 * @returns {Promise<{ review: object, template: object, responses: object[] }>}
 */
export async function getReviewerChecklist(submissionId) {
  const res = await api.get(`/submissions/${submissionId}/checklist`);
  return res.data?.data;
}

/**
 * Save checklist draft for reviewer.
 * @param {string} submissionId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function saveReviewerChecklistDraft(submissionId, payload) {
  const res = await api.put(`/submissions/${submissionId}/checklist`, payload);
  return res.data?.data;
}

/**
 * Submit checklist review for reviewer.
 * @param {string} submissionId
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function submitReviewerChecklist(submissionId, payload) {
  const res = await api.post(`/submissions/${submissionId}/checklist/submit`, payload);
  return res.data?.data;
}
