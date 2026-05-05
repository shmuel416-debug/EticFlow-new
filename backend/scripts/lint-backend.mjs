/**
 * EthicFlow — Backend lint script
 * Runs JavaScript syntax checks on backend source files.
 */
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

/**
 * Recursively collects JavaScript-like files from a directory.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectJsFiles(path))
      continue
    }
    if (/\.(js|mjs|cjs)$/.test(entry.name)) files.push(path)
  }
  return files
}

/**
 * Runs `node --check` against one file path.
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function syntaxCheckFile(filePath) {
  await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['--check', filePath], { stdio: 'inherit' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Syntax check failed: ${filePath}`))
    })
  })
}

/**
 * Entry point that checks all backend code files.
 * @returns {Promise<void>}
 */
async function main() {
  const roots = ['src', 'prisma', 'scripts']
  const files = []
  for (const root of roots) files.push(...await collectJsFiles(root))
  for (const filePath of files) await syntaxCheckFile(filePath)
  console.log(`Backend lint passed (${files.length} files checked).`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
