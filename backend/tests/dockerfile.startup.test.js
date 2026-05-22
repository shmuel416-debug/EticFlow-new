/**
 * EthicFlow — Backend Docker startup tests.
 * Verifies production container startup avoids destructive bootstrap steps.
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const DOCKERFILE_PATH = resolve(CURRENT_DIRECTORY, '../Dockerfile')

/**
 * Reads the backend Dockerfile contents.
 * @returns {Promise<string>} Dockerfile text.
 */
async function readDockerfile() {
  return readFile(DOCKERFILE_PATH, 'utf8')
}

/**
 * Extracts the Docker CMD declaration from Dockerfile text.
 * @param {string} dockerfile
 * @returns {string}
 */
function getStartupCommand(dockerfile) {
  return dockerfile.split('\n').find((line) => line.startsWith('CMD ')) || ''
}

describe('backend Docker startup command', () => {
  test('runs migrations without reseeding the database on container start', async () => {
    const dockerfile = await readDockerfile()
    const startupCommand = getStartupCommand(dockerfile)

    expect(startupCommand).toContain('prisma migrate deploy')
    expect(startupCommand).not.toMatch(/prisma\s+db\s+seed/)
  })
})
