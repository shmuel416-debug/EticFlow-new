---
name: prisma-schema
description: Use when creating or modifying Prisma schema, migrations, or database queries
---

# Prisma Conventions

## Naming
- Models: PascalCase → @@map("snake_case")
- Fields: camelCase → @map("snake_case")
- Enums: PascalCase, values: UPPER_SNAKE_CASE

## Required on Every Model
- `id String @id @default(uuid())`
- `createdAt DateTime @default(now()) @map("created_at")`
- Soft delete via `isActive Boolean @default(true)` — never hard delete

## User Model — SSO-Ready
```prisma
enum AuthProvider { LOCAL  MICROSOFT  GOOGLE }

model User {
  id            String       @id @default(uuid())
  email         String       @unique
  passwordHash  String?      @map("password_hash")    // NULL for SSO users
  fullName      String       @map("full_name")
  role          Role         @default(RESEARCHER)
  department    String?
  phone         String?
  authProvider  AuthProvider  @default(LOCAL) @map("auth_provider")
  externalId    String?      @map("external_id")      // SSO provider Object ID
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at")
  @@map("users")
}
```
Rules:
- password_hash is **nullable** — NULL when auth_provider != LOCAL
- externalId stores Microsoft/Google Object ID for sync
- NEVER return password_hash in API responses
- When SSO login: lookup by email → if exists, create JWT from our data
- When creating user for SSO: set password_hash = null, authProvider = MICROSOFT/GOOGLE

## Migrations
- Name descriptively: `--name add_meetings_table`
- Never edit migration files after they run
- After schema change → migrate → regenerate client

## Queries
- Prisma Client only — never raw SQL
- Always paginate: `{ skip, take, orderBy }`
- Use `select`/`include` to limit data
- Multi-table writes → `prisma.$transaction()`
