/**
 * EthicFlow — AppError Class
 * Custom error class for all application errors.
 * Use static factory methods for common error types.
 * Error format: { error: string, code: string, details?: object }
 */

export class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message
   * @param {string} code       - Machine-readable error code (e.g. 'NOT_FOUND')
   * @param {number} statusCode - HTTP status code
   * @param {object} [details]  - Optional extra context (e.g. Zod field errors)
   */
  constructor(message, code, statusCode = 500, details = undefined) {
    super(message)
    this.name       = 'AppError'
    this.code       = code
    this.statusCode = statusCode
    this.details    = details
  }

  /**
   * 404 Not Found.
   * @param {string} [resource] - Name of the missing resource
   * @returns {AppError}
   */
  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 'NOT_FOUND', 404)
  }

  /**
   * 401 Unauthorized — missing or invalid token.
   * @returns {AppError}
   */
  static unauthorized() {
    return new AppError('Authentication required', 'UNAUTHORIZED', 401)
  }

  /**
   * 403 Forbidden — authenticated but insufficient role.
   * @returns {AppError}
   */
  static forbidden() {
    return new AppError('Access denied', 'FORBIDDEN', 403)
  }

  /**
   * 400 Validation Error — Zod field errors.
   * @param {object} details - Zod flattened error object
   * @returns {AppError}
   */
  static validation(details) {
    return new AppError('Validation failed', 'VALIDATION_ERROR', 400, details)
  }

  /**
   * 409 Conflict — duplicate unique field.
   * @param {string} [field] - The conflicting field name
   * @returns {AppError}
   */
  static conflict(field = 'record') {
    return new AppError(`${field} already exists`, 'CONFLICT', 409)
  }
}
