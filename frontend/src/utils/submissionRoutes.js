/**
 * Ethic-Net — Submission URL helpers
 * Builds readable, canonical submission URLs across researcher/reviewer/secretary/chairman screens.
 */

/**
 * Normalizes free text into a URL-safe slug.
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function slugifySubmissionTitle(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!text) return ''
  return text
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * Returns the best public-facing submission reference.
 * @param {{ applicationId?: string, id?: string }|null|undefined} submission
 * @returns {string}
 */
export function getSubmissionPublicRef(submission) {
  if (submission?.applicationId) return submission.applicationId
  return submission?.id || ''
}

/**
 * Builds `/submissions/:ref/:slug` for status/detail pages.
 * @param {string} basePath
 * @param {{ applicationId?: string, id?: string, title?: string }|null|undefined} submission
 * @returns {string}
 */
export function buildSubmissionDetailPath(basePath, submission) {
  const ref = getSubmissionPublicRef(submission)
  const slug = slugifySubmissionTitle(submission?.title)
  if (!ref) return basePath
  return slug
    ? `${basePath}/${encodeURIComponent(ref)}/${encodeURIComponent(slug)}`
    : `${basePath}/${encodeURIComponent(ref)}`
}

/**
 * Builds `/submissions/:ref/edit/:slug` for edit pages.
 * @param {string} basePath
 * @param {{ applicationId?: string, id?: string, title?: string }|null|undefined} submission
 * @returns {string}
 */
export function buildSubmissionEditPath(basePath, submission) {
  const ref = getSubmissionPublicRef(submission)
  const slug = slugifySubmissionTitle(submission?.title)
  if (!ref) return `${basePath}/new`
  return slug
    ? `${basePath}/${encodeURIComponent(ref)}/edit/${encodeURIComponent(slug)}`
    : `${basePath}/${encodeURIComponent(ref)}/edit`
}

/**
 * Resolves route by submission status.
 * @param {{ status?: string, applicationId?: string, id?: string, title?: string }|null|undefined} submission
 * @returns {string}
 */
export function buildResearcherSubmissionPath(submission) {
  if (!submission) return '/submissions'
  if (submission.status === 'DRAFT' || submission.status === 'PENDING_REVISION') {
    return buildSubmissionEditPath('/submissions', submission)
  }
  return buildSubmissionDetailPath('/submissions', submission)
}

