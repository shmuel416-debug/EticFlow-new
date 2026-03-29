/**
 * EthicFlow — Zod Validation Middleware
 * Wraps a Zod schema into an Express middleware.
 * On failure: passes a 400 AppError to next().
 * On success: replaces req.body with the parsed (typed) data.
 */

import { AppError } from '../utils/errors.js'

/**
 * Creates an Express middleware that validates req.body against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler} Express middleware
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return next(AppError.validation(result.error.flatten()))
    }
    req.body = result.data
    next()
  }
}

/**
 * Creates an Express middleware that validates req.query against a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {import('express').RequestHandler} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return next(AppError.validation(result.error.flatten()))
    }
    req.query = result.data
    next()
  }
}
