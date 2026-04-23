/**
 * EthicFlow — Reports Controller
 * Provides aggregated statistics, XLSX export, and paginated audit log.
 *
 * Endpoints:
 *   GET /api/reports/stats                — aggregated submission statistics
 *   GET /api/reports/export/submissions   — export submissions as XLSX file
 *   GET /api/audit-logs                   — paginated audit log (ADMIN only)
 */

import ExcelJS from 'exceljs'
import prisma  from '../config/database.js'

const STATUS_LABELS = {
  SUBMITTED:        { he: 'הוגש',            en: 'Submitted' },
  IN_TRIAGE:        { he: 'בבדיקה ראשונית', en: 'In Triage' },
  ASSIGNED:         { he: 'הוקצה',           en: 'Assigned' },
  IN_REVIEW:        { he: 'בביקורת',         en: 'In Review' },
  PENDING_REVISION: { he: 'ממתין לתיקון',    en: 'Pending Revision' },
  APPROVED:         { he: 'אושר',            en: 'Approved' },
  REJECTED:         { he: 'נדחה',            en: 'Rejected' },
  WITHDRAWN:        { he: 'בוטל',            en: 'Withdrawn' },
  DRAFT:            { he: 'טיוטה',           en: 'Draft' },
  CONTINUED:        { he: 'המשך',            en: 'Continued' },
}

const TRACK_LABELS = {
  FULL:      { he: 'מסלול מלא',   en: 'Full' },
  EXPEDITED: { he: 'מסלול מואץ',  en: 'Expedited' },
  EXEMPT:    { he: 'פטור',        en: 'Exempt' },
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

/**
 * GET /api/reports/stats
 * Returns aggregated statistics for the dashboard:
 * - counts by status
 * - counts by track
 * - monthly submission trend (last 12 months)
 * - approval rate
 * - average processing time (days) for approved submissions
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getStats(req, res, next) {
  try {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const [
      byStatus,
      byTrack,
      recentSubmissions,
      totalApproved,
      totalDecided,
      avgProcessingRaw,
    ] = await Promise.all([
      // Count per status
      prisma.submission.groupBy({
        by:    ['status'],
        where: { isActive: true },
        _count: { id: true },
      }),

      // Count per track
      prisma.submission.groupBy({
        by:    ['track'],
        where: { isActive: true },
        _count: { id: true },
      }),

      // Monthly trend — fetch last 12 months of submissions
      prisma.submission.findMany({
        where:  { isActive: true, createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Total approved
      prisma.submission.count({ where: { isActive: true, status: 'APPROVED' } }),

      // Total decided (APPROVED + REJECTED)
      prisma.submission.count({
        where: { isActive: true, status: { in: ['APPROVED', 'REJECTED'] } },
      }),

      // Raw data for average processing time
      prisma.submission.findMany({
        where:  { isActive: true, status: 'APPROVED' },
        select: { createdAt: true, updatedAt: true },
        take:   200,
      }),
    ])

    // Build monthly trend buckets
    const monthlyMap = buildMonthlyBuckets()
    for (const { createdAt } of recentSubmissions) {
      const key = monthKey(createdAt)
      if (monthlyMap[key] !== undefined) monthlyMap[key]++
    }
    const monthlyTrend = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }))

    // Approval rate
    const approvalRate = totalDecided > 0
      ? Math.round((totalApproved / totalDecided) * 100)
      : 0

    // Average processing time in days
    let avgDays = 0
    if (avgProcessingRaw.length > 0) {
      const total = avgProcessingRaw.reduce((sum, s) => {
        const diff = new Date(s.updatedAt) - new Date(s.createdAt)
        return sum + diff / (1000 * 60 * 60 * 24)
      }, 0)
      avgDays = Math.round(total / avgProcessingRaw.length)
    }

    res.json({
      data: {
        byStatus:     byStatus.map(r => ({ status: r.status, count: r._count.id })),
        byTrack:      byTrack.map(r => ({ track: r.track, count: r._count.id })),
        monthlyTrend,
        approvalRate,
        avgProcessingDays: avgDays,
        totalApproved,
        totalDecided,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// EXPORT XLSX
// ─────────────────────────────────────────────

/**
 * GET /api/reports/export/submissions
 * Generates an XLSX file with all submissions and streams it to the client.
 * @param {import('express').Request}  req - query: { status?, track?, from?, to? }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function exportSubmissions(req, res, next) {
  try {
    const { status, track, from, to } = req.query
    const lang = req.query.lang === 'en' ? 'en' : 'he'

    const where = { isActive: true }
    if (status) where.status = status
    if (track)  where.track  = track
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        applicationId: true,
        title:         true,
        status:        true,
        track:         true,
        createdAt:     true,
        updatedAt:     true,
        author:        { select: { fullName: true, email: true } },
        reviewer:      { select: { fullName: true } },
        slaTracking:   { select: { isBreached: true } },
      },
    })

    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Submissions')
    worksheet.views = [{ rightToLeft: lang === 'he' }]

    const columns = lang === 'he'
      ? [
          { header: 'מספר בקשה',      key: 'applicationId', width: 20 },
          { header: 'כותרת',          key: 'title',         width: 40 },
          { header: 'סטטוס',          key: 'status',        width: 18 },
          { header: 'מסלול',          key: 'track',         width: 14 },
          { header: 'חוקר',           key: 'author',        width: 25 },
          { header: 'אימייל חוקר',    key: 'email',         width: 30 },
          { header: 'סוקר',           key: 'reviewer',      width: 25 },
          { header: 'חריגת SLA',      key: 'slaBreach',     width: 14 },
          { header: 'תאריך יצירה',    key: 'createdAt',     width: 20 },
          { header: 'תאריך עדכון',    key: 'updatedAt',     width: 20 },
        ]
      : [
          { header: 'Application ID', key: 'applicationId', width: 20 },
          { header: 'Title',          key: 'title',         width: 40 },
          { header: 'Status',         key: 'status',        width: 18 },
          { header: 'Track',          key: 'track',         width: 14 },
          { header: 'Author',         key: 'author',        width: 25 },
          { header: 'Author Email',   key: 'email',         width: 30 },
          { header: 'Reviewer',       key: 'reviewer',      width: 25 },
          { header: 'SLA Breached',   key: 'slaBreach',     width: 14 },
          { header: 'Created',        key: 'createdAt',     width: 20 },
          { header: 'Updated',        key: 'updatedAt',     width: 20 },
        ]
    worksheet.columns = columns

    // Style header row
    worksheet.getRow(1).font   = { bold: true }
    worksheet.getRow(1).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    worksheet.getRow(1).font   = { bold: true, color: { argb: 'FFFFFFFF' } }

    for (const s of submissions) {
      worksheet.addRow({
        applicationId: s.applicationId,
        title:         s.title,
        status:        STATUS_LABELS[s.status]?.[lang] ?? s.status,
        track:         TRACK_LABELS[s.track]?.[lang] ?? s.track,
        author:        s.author?.fullName ?? '',
        email:         s.author?.email ?? '',
        reviewer:      s.reviewer?.fullName ?? '',
        slaBreach:     s.slaTracking?.isBreached
          ? (lang === 'he' ? 'כן' : 'Yes')
          : (lang === 'he' ? 'לא' : 'No'),
        createdAt:     s.createdAt.toISOString().slice(0, 10),
        updatedAt:     s.updatedAt.toISOString().slice(0, 10),
      })
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="ethicflow-submissions-${lang}-${Date.now()}.xlsx"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

/**
 * GET /api/audit-logs
 * Returns paginated audit log entries (ADMIN only).
 * @param {import('express').Request}  req - query: { action?, entityType?, userId?, from?, to?, page, limit }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getAuditLogs(req, res, next) {
  try {
    const { action, entityType, userId, from, to, page = '1', limit = '50' } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where = {}
    if (action)     where.action     = { contains: action, mode: 'insensitive' }
    if (entityType) where.entityType = entityType
    if (userId)     where.userId     = userId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, fullName: true, email: true, roles: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({
      data:       logs,
      pagination: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
    })
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Builds an ordered map of the last 12 calendar months (YYYY-MM → 0).
 * @returns {Record<string, number>}
 */
function buildMonthlyBuckets() {
  const result = {}
  const now    = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result[monthKey(d)] = 0
  }
  return result
}

/**
 * Returns YYYY-MM key for a date.
 * @param {Date|string} date
 * @returns {string}
 */
function monthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
