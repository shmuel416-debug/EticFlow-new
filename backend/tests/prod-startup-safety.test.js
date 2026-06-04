/**
 * Ethic-Net - Production startup safety tests.
 * Guards against accidentally loading development seed accounts in production.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Reads a repository file relative to the backend package directory.
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
async function readRepoFile(relativePath) {
  return fs.readFile(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('production startup safety', () => {
  test('production Docker entrypoint runs migrations without development seed data', async () => {
    const dockerfile = await readRepoFile('Dockerfile')

    expect(dockerfile).toContain('prisma migrate deploy')
    expect(dockerfile).not.toContain('prisma db seed')
  })

  test('production bootstrap upserts admin without invoking development seed data', async () => {
    const bootstrap = await readRepoFile('scripts/prod-bootstrap.mjs')

    expect(bootstrap).toContain('prisma\', \'migrate\', \'deploy')
    expect(bootstrap).toContain('upsertAdmin')
    expect(bootstrap).not.toContain('prisma\', \'db\', \'seed')
  })

  test('development seed refuses to run under NODE_ENV production', async () => {
    const seed = await readRepoFile('prisma/seed.js')

    expect(seed).toContain("process.env.NODE_ENV === 'production'")
    expect(seed).toContain('Refusing to run development seed in production')
  })
})
