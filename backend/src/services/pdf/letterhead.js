/**
 * Ethic-Net — PDF letterhead compositor.
 * Applies a configured letterhead PDF as the background for all generated pages.
 */

import fs from 'fs/promises'
import { PDFDocument } from 'pdf-lib'
import prisma from '../../config/database.js'

const DEFAULT_LETTERHEAD_PATH = 'C:/Users/shmue/Downloads/בלאנק לוגו חדש.pdf'
const LETTERHEAD_SETTING_KEY = 'system_letterhead_pdf_path'

/** @type {Uint8Array|null} */
let cachedLetterheadBytes = null

/** @type {string} */
let cachedLetterheadPath = ''

/**
 * Resolves letterhead path from DB settings.
 * @returns {Promise<string>}
 */
async function resolveLetterheadPathFromSettings() {
  const row = await prisma.institutionSetting.findUnique({
    where: { key: LETTERHEAD_SETTING_KEY },
    select: { value: true },
  })
  return String(row?.value ?? '').trim()
}

/**
 * Resolves system letterhead PDF path from settings, env, or fallback.
 * @returns {Promise<string>}
 */
async function resolveLetterheadPath() {
  const settingPath = await resolveLetterheadPathFromSettings().catch(() => '')
  if (settingPath) return settingPath
  const envPath = process.env.SYSTEM_LETTERHEAD_PDF_PATH?.trim()
  return envPath || DEFAULT_LETTERHEAD_PATH
}

/**
 * Loads letterhead PDF bytes from disk with memoization.
 * @returns {Promise<Uint8Array|null>}
 */
async function loadLetterheadBytes() {
  const letterheadPath = await resolveLetterheadPath()
  if (!letterheadPath) return null
  if (cachedLetterheadBytes && cachedLetterheadPath === letterheadPath) {
    return cachedLetterheadBytes
  }
  try {
    const bytes = await fs.readFile(letterheadPath)
    cachedLetterheadBytes = bytes
    cachedLetterheadPath = letterheadPath
    return bytes
  } catch {
    return null
  }
}

/**
 * Applies configured letterhead PDF under each page of an existing PDF file.
 * No-op when letterhead is missing or invalid.
 * @param {string} pdfPath
 * @returns {Promise<void>}
 */
export async function applySystemLetterhead(pdfPath) {
  const letterheadBytes = await loadLetterheadBytes()
  if (!letterheadBytes) return
  try {
    const sourceBytes = await fs.readFile(pdfPath)
    const [sourceDoc, letterheadDoc] = await Promise.all([
      PDFDocument.load(sourceBytes),
      PDFDocument.load(letterheadBytes),
    ])
    if (letterheadDoc.getPageCount() === 0) return

    const composedDoc = await PDFDocument.create()
    const letterheadPage = letterheadDoc.getPage(0)
    const letterheadEmbeddedPage = await composedDoc.embedPage(letterheadPage)

    for (const sourcePage of sourceDoc.getPages()) {
      const { width, height } = sourcePage.getSize()
      const outputPage = composedDoc.addPage([width, height])
      const sourceEmbeddedPage = await composedDoc.embedPage(sourcePage)
      outputPage.drawPage(letterheadEmbeddedPage, { x: 0, y: 0, width, height })
      outputPage.drawPage(sourceEmbeddedPage, { x: 0, y: 0, width, height })
    }

    const composedBytes = await composedDoc.save()
    await fs.writeFile(pdfPath, composedBytes)
  } catch {
    // Keep PDF generation available even when the configured letterhead is invalid.
  }
}
