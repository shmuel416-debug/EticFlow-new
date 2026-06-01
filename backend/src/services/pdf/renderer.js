/**
 * Ethic-Net — PDF HTML renderer
 * Renders HTML to PDF using Puppeteer/Chromium.
 */

import puppeteer from 'puppeteer'
import { applySystemLetterhead } from './letterhead.js'

/** @type {boolean} */
let availabilityChecked = false

/**
 * Resolves Chromium executable path for Puppeteer.
 * @returns {string}
 */
function resolveExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || puppeteer.executablePath()
}

/**
 * Builds launch options shared by render and startup checks.
 * @returns {import('puppeteer').LaunchOptions}
 */
function launchOptions() {
  return {
    headless: true,
    executablePath: resolveExecutablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  }
}

/**
 * Ensures Puppeteer can launch Chromium in this environment.
 * Throws with actionable details when unavailable.
 * @returns {Promise<void>}
 */
export async function assertPuppeteerAvailable() {
  if (availabilityChecked) return
  let browser
  try {
    browser = await puppeteer.launch(launchOptions())
    availabilityChecked = true
  } catch (err) {
    const executablePath = resolveExecutablePath()
    throw new Error(
      `Puppeteer/Chromium is not available. Check Chromium installation and PUPPETEER_EXECUTABLE_PATH (${executablePath}). Root error: ${err?.message ?? err}`
    )
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * Renders an HTML document to PDF.
 * @param {string} html
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export async function renderHtmlToPdf(html, outputPath) {
  await assertPuppeteerAvailable()
  const browser = await puppeteer.launch(launchOptions())
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
    await page
      .evaluate(async () => {
        try {
          await document.fonts.ready
        } catch {
          // Ignore font-ready failures and let Chromium fallback.
        }
      })
      .catch(() => {})
    await page.emulateMediaType('print')
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
  } finally {
    await browser.close()
  }
  await applySystemLetterhead(outputPath)
}
