/**
 * EthicFlow — Backend Dockerfile startup tests.
 * Verifies production startup avoids destructive development seed execution.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCKERFILE_PATH = path.resolve(__dirname, '../Dockerfile')

/**
 * Reads the backend production Dockerfile.
 * @returns {string}
 */
function readBackendDockerfile() {
  return readFileSync(DOCKERFILE_PATH, 'utf8')
}

describe('backend Dockerfile startup command', () => {
  test('applies migrations without running development seed data', () => {
    const dockerfile = readBackendDockerfile()
    const startupCommand = dockerfile
      .split('\n')
      .find((line) => line.trim().startsWith('CMD '))

    expect(startupCommand).toContain('prisma migrate deploy')
    expect(startupCommand).not.toContain('prisma db seed')
  })
})
