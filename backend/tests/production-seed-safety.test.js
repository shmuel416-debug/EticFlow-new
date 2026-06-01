/**
 * Ethic-Net — Production seed safety tests.
 * Locks production startup/bootstrap away from development fixture seeding.
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TEST_DIR = dirname(fileURLToPath(import.meta.url))
const BACKEND_DIR = resolve(TEST_DIR, '..')
const REPO_DIR = resolve(BACKEND_DIR, '..')

/**
 * Reads a repository file as UTF-8 text.
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
function readRepoFile(relativePath) {
  return readFile(resolve(REPO_DIR, relativePath), 'utf8')
}

/**
 * Extracts the Dockerfile CMD line.
 * @param {string} dockerfile
 * @returns {string}
 */
function getDockerCmd(dockerfile) {
  return dockerfile
    .split('\n')
    .find((line) => line.trim().startsWith('CMD ')) || ''
}

describe('production seed safety', () => {
  test('backend container startup does not run development seed data', async () => {
    const dockerfile = await readRepoFile('backend/Dockerfile')
    const startupCommand = getDockerCmd(dockerfile)

    expect(startupCommand).toContain('prisma migrate deploy')
    expect(startupCommand).not.toContain('prisma db seed')
  })

  test('production bootstrap does not run the development seed script', async () => {
    const bootstrap = await readRepoFile('backend/scripts/prod-bootstrap.mjs')

    expect(bootstrap).toContain("['prisma', 'migrate', 'deploy']")
    expect(bootstrap).not.toContain("['prisma', 'db', 'seed']")
  })

  test('development seed refuses to run in production', async () => {
    const seed = await readRepoFile('backend/prisma/seed.js')

    expect(seed).toContain("process.env.NODE_ENV !== 'production'")
    expect(seed).toContain('Refusing to run development seed')
  })
})
