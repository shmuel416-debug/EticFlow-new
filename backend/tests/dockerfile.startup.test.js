/**
 * EthicFlow — Backend Docker startup tests
 * Verifies production startup avoids destructive data seeding.
 */

import { readFileSync } from 'node:fs'

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')

describe('backend Dockerfile startup command', () => {
  test('runs migrations without running database seed on every start', () => {
    expect(dockerfile).toContain('prisma migrate deploy')
    expect(dockerfile).not.toContain('prisma db seed')
  })
})
