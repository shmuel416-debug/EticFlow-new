/**
 * EthicFlow — shared PDF HTML layout utilities.
 */

import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = path.resolve(__dirname, '../fonts')

/**
 * Loads a font file and returns base64 content.
 * @param {string} filename
 * @returns {string}
 */
function loadFontBase64(filename) {
  const fullPath = path.join(FONTS_DIR, filename)
  if (!existsSync(fullPath)) return ''
  try {
    return readFileSync(fullPath).toString('base64')
  } catch {
    return ''
  }
}

const HEBOO_REGULAR_B64 = loadFontBase64('Heebo-Regular.ttf')
const HEBOO_BOLD_B64 = loadFontBase64('Heebo-Bold.ttf')
const DAVID_REGULAR_B64 = loadFontBase64('DavidLibre-Regular.ttf')
const DAVID_BOLD_B64 = loadFontBase64('DavidLibre-Bold.ttf')
const ARIAL_REGULAR_B64 = loadFontBase64('Arial.ttf')
const ARIAL_BOLD_B64 = loadFontBase64('Arial-Bold.ttf')

/**
 * Escapes HTML special characters to keep template rendering safe.
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Returns @font-face CSS declarations with embedded fonts.
 * @returns {string}
 */
export function fontFaceCss() {
  const fontBlocks = []
  if (HEBOO_REGULAR_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'Heebo';
  font-weight: 400;
  src: url('data:font/truetype;base64,${HEBOO_REGULAR_B64}') format('truetype');
}`)
  }
  if (HEBOO_BOLD_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'Heebo';
  font-weight: 700;
  src: url('data:font/truetype;base64,${HEBOO_BOLD_B64}') format('truetype');
}`)
  }
  if (DAVID_REGULAR_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'David Libre';
  font-weight: 400;
  src: url('data:font/truetype;base64,${DAVID_REGULAR_B64}') format('truetype');
}`)
  }
  if (DAVID_BOLD_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'David Libre';
  font-weight: 700;
  src: url('data:font/truetype;base64,${DAVID_BOLD_B64}') format('truetype');
}`)
  }
  if (ARIAL_REGULAR_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'Arial';
  font-weight: 400;
  src: url('data:font/truetype;base64,${ARIAL_REGULAR_B64}') format('truetype');
}`)
  }
  if (ARIAL_BOLD_B64) {
    fontBlocks.push(`@font-face {
  font-family: 'Arial';
  font-weight: 700;
  src: url('data:font/truetype;base64,${ARIAL_BOLD_B64}') format('truetype');
}`)
  }
  return fontBlocks.join('\n')
}

/**
 * Returns shared CSS for both Hebrew (RTL) and English (LTR) PDFs.
 * @param {string} brandPrimary
 * @returns {string}
 */
export function baseCss(brandPrimary) {
  return `
${fontFaceCss()}
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body {
  font-family: 'Heebo', 'David Libre', 'Arial', sans-serif;
  font-size: 13pt;
  line-height: 1.75;
  color: #1e293b;
  background: white;
}
#ef-doc-root { width: 100%; min-height: 100%; unicode-bidi: isolate; }
.page {
  width: 210mm;
  min-height: 296mm;
  max-height: 296mm;
  display: flex;
  flex-direction: column;
  page-break-inside: avoid;
  break-inside: avoid-page;
  overflow: hidden;
}
.header {
  background: ${brandPrimary};
  color: #ffffff;
  padding: 24px 36px 18px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.brand-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.brand-name { font-size: 20pt; font-weight: 700; }
.header-sub { font-size: 9.5pt; color: rgba(255, 255, 255, 0.85); margin-top: 4px; }
.header-date { font-size: 9pt; color: #dbeafe; margin-top: 8px; }
.content {
  padding: 22px 34px 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.doc-title { text-align: center; margin-bottom: 4px; }
.doc-title h2 { font-size: 17pt; font-weight: 700; color: ${brandPrimary}; }
.issue-date { text-align: center; color: #64748b; font-size: 10pt; margin-bottom: 14px; }
hr { border: none; border-top: 1.5px solid ${brandPrimary}; margin: 10px 0; }
hr.light { border-color: #e2e8f0; border-width: 1px; }
.addressee { margin-bottom: 10px; font-size: 11pt; text-align: start; }
.to-label { font-weight: 700; color: ${brandPrimary}; }
.email { color: #64748b; font-size: 9.5pt; margin-top: 2px; }
.subject { font-weight: 700; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 6px; text-align: start; }
.body-text { font-size: 11pt; color: #374151; line-height: 1.65; margin-bottom: 10px; text-align: start; }
.details-box {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  padding: 4px 16px;
  margin: 10px 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.details-table { width: 100%; border-collapse: collapse; font-size: 11pt; }
.details-table tr + tr td { border-top: 1px solid #e2e8f0; }
.details-table td { padding: 7px 4px; vertical-align: baseline; }
.details-table .lbl {
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
  width: 40%;
  font-size: 10pt;
  text-align: start;
}
.details-table .val {
  color: #0f172a;
  font-weight: 700;
  padding-inline-start: 14px;
  text-align: start;
  word-break: break-word;
}
.conditions-title { font-weight: 700; color: ${brandPrimary}; font-size: 12pt; margin-bottom: 6px; text-align: start; }
.conditions-list { list-style: none; padding: 0; margin: 0 0 8px 0; text-align: start; }
.conditions-list li {
  font-size: 11pt;
  color: #374151;
  line-height: 1.5;
  padding: 3px 0 3px 14px;
  position: relative;
}
.conditions-list li::before {
  content: '•';
  color: ${brandPrimary};
  font-weight: 700;
  position: absolute;
  left: 0;
  top: 0.15em;
}
.signature-section { text-align: center; margin-top: 14px; }
.sig-line { border-top: 1px solid #94a3b8; width: 260px; margin: 0 auto 8px; }
.sig-label { color: ${brandPrimary}; font-weight: 700; font-size: 11pt; }
.sig-fields { margin-top: 10px; width: 100%; border-collapse: separate; border-spacing: 16px 0; }
.sig-fields td {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 12px;
  min-height: 60px;
  vertical-align: top;
  text-align: start;
  width: 50%;
}
.sig-img { max-height: 52px; max-width: 100%; object-fit: contain; display: block; margin: 4px 0 8px; }
.box-label { color: #64748b; font-size: 9pt; margin-bottom: 12px; text-align: start; }
.box-line { border-top: 1px solid #94a3b8; margin-top: 8px; }
.footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 8pt;
  color: #94a3b8;
  line-height: 1.6;
}
.footer-legal { margin-bottom: 6px; }
.ltr-val { direction: ltr; unicode-bidi: isolate; display: inline-block; }
.rtl-root { direction: rtl; }
.rtl-root .brand-row,
.rtl-root .addressee,
.rtl-root .subject,
.rtl-root .body-text,
.rtl-root .conditions-title,
.rtl-root .conditions-list,
.rtl-root .details-table .lbl,
.rtl-root .details-table .val,
.rtl-root .box-label,
.rtl-root .sig-fields td {
  text-align: right;
}
.rtl-root .brand-row { flex-direction: row-reverse; }
.rtl-root .conditions-list li {
  padding: 3px 14px 3px 0;
  text-align: right;
}
.rtl-root .conditions-list li::before { left: auto; right: 0; }
.rtl-root .details-table .val { padding-inline-start: 0; padding-inline-end: 14px; }
`
}

/**
 * Wraps the provided body content in a complete HTML shell.
 * @param {{ dir: 'rtl'|'ltr', lang: string, bodyHtml: string, brandPrimary: string }} params
 * @returns {string}
 */
export function pageShell({ dir, lang, bodyHtml, brandPrimary }) {
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8">
<style>
${baseCss(brandPrimary)}
</style>
</head>
<body>
<div id="ef-doc-root" class="${dir === 'rtl' ? 'rtl-root' : ''}" dir="${dir}" lang="${lang}">
${bodyHtml}
</div>
</body>
</html>`
}
