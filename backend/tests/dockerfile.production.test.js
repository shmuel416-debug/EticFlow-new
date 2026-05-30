/**
 * EthicFlow — production Dockerfile regression tests.
 * Guards API container startup against production-only deployment hazards.
 */

import { readFile } from 'node:fs/promises'

/**
 * Reads the backend Dockerfile contents.
 * @returns {Promise<string>}
 */
async function readDockerfile() {
  return readFile(new URL('../Dockerfile', import.meta.url), 'utf8')
}

describe('backend production Dockerfile', () => {
  test('runs migrations without seeding test users on startup', async () => {
    const dockerfile = await readDockerfile()

    expect(dockerfile).toContain('prisma migrate deploy')
    expect(dockerfile).not.toContain('prisma db seed')
  })
})
