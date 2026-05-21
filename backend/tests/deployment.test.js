/**
 * EthicFlow — deployment safety regression tests.
 */

import fs from 'fs/promises'
import path from 'path'

/**
 * Reads the backend production Dockerfile.
 * @returns {Promise<string>}
 */
async function readBackendDockerfile() {
  return fs.readFile(path.resolve(process.cwd(), 'Dockerfile'), 'utf8')
}

describe('production deployment container', () => {
  it('does not run development seed data on startup', async () => {
    const dockerfile = await readBackendDockerfile()
    const startupCommand = dockerfile
      .split('\n')
      .find((line) => line.startsWith('CMD '))

    expect(startupCommand).toBeDefined()
    expect(startupCommand).not.toContain('prisma db seed')
  })
})
