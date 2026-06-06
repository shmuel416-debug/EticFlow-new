/**
 * Ethic-Net — Production startup regression tests.
 * Verifies production boot paths cannot run the development seed.
 */

import { readFile } from 'node:fs/promises'

/**
 * Reads a repository file relative to the backend tests directory.
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
function readBackendFile(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

describe('production startup commands', () => {
  test('backend Dockerfile runs migrations without running the development seed', async () => {
    const dockerfile = await readBackendFile('../Dockerfile')

    expect(dockerfile).toMatch(/prisma migrate deploy/)
    expect(dockerfile).not.toMatch(/prisma db seed/)
  })

  test('production bootstrap migrates and upserts admin without invoking seed', async () => {
    const bootstrap = await readBackendFile('../scripts/prod-bootstrap.mjs')

    expect(bootstrap).toMatch(/migrate', 'deploy/)
    expect(bootstrap).toMatch(/upsertAdminUser/)
    expect(bootstrap).not.toMatch(/'db', 'seed/)
    expect(bootstrap).not.toMatch(/prisma db seed/)
  })
})
