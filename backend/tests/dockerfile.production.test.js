/**
 * EthicFlow — production Dockerfile safety tests.
 * Ensures production container startup does not reset seeded application data.
 */

import fs from 'fs/promises'

describe('production Dockerfile startup', () => {
  test('runs migrations without invoking destructive seed data', async () => {
    const dockerfile = await fs.readFile(new URL('../Dockerfile', import.meta.url), 'utf8')

    expect(dockerfile).toContain('prisma migrate deploy')
    expect(dockerfile).not.toContain('prisma db seed')
  })
})
