/**
 * EthicFlow — migration smoke test
 * Verifies the multi-role migration SQL contains required operations.
 */

import fs from 'fs/promises'
import path from 'path'

describe('multi-role migration SQL', () => {
  test('contains roles migration and conflict declarations table', async () => {
    const sqlPath = path.resolve(
      process.cwd(),
      'prisma/migrations/20260423120000_multi_roles_and_conflicts/migration.sql'
    )
    const sql = await fs.readFile(sqlPath, 'utf8')
    expect(sql).toContain('ADD COLUMN "roles" "Role"[]')
    expect(sql).toContain('DROP COLUMN "role"')
    expect(sql).toContain('CREATE TABLE "conflict_declarations"')
  })
})
