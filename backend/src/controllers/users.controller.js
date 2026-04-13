/**
 * EthicFlow — Users Controller
 * Handles user-related queries for staff roles.
 * Currently exposes: listReviewers (for secretary's reviewer assignment dropdown).
 */

import prisma from '../config/database.js'

/**
 * GET /api/users/reviewers
 * Returns all active REVIEWER users for the assignment dropdown.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function listReviewers(req, res, next) {
  try {
    const reviewers = await prisma.user.findMany({
      where:   { role: 'REVIEWER', isActive: true },
      select:  { id: true, fullName: true, email: true, department: true },
      orderBy: { fullName: 'asc' },
    })

    res.json({ data: reviewers })
  } catch (err) {
    next(err)
  }
}
