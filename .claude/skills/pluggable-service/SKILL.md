---
name: pluggable-service
description: Use when creating or modifying pluggable services (AI, Email, Storage)
---

# Pluggable Service Pattern

Every external service MUST follow this pattern so institutions can swap providers via .env.

## Structure
```
services/
  ai.service.js         → Factory: AI_PROVIDER (mock/gemini/openai)
  ai/
    mock.provider.js    → Dev: returns fixed responses
    gemini.provider.js  → Google Gemini API
  email.service.js      → Factory: EMAIL_PROVIDER (console/smtp/microsoft/gmail)
  email/
    console.provider.js → Dev: prints to terminal
    smtp.provider.js    → Generic SMTP
    microsoft.provider.js → Phase 2: Microsoft Graph API
    gmail.provider.js   → Phase 2: Gmail API
  storage.service.js    → Factory: STORAGE_PROVIDER (local/s3/azure)
  storage/
    local.provider.js   → Dev: saves to ./uploads/
    s3.provider.js      → Phase 2: AWS S3
    azure.provider.js   → Phase 2: Azure Blob
  calendar.service.js   → Factory: CALENDAR_PROVIDER (internal/microsoft/google)
  calendar/
    internal.provider.js → Default: saves to DB, no external sync
    microsoft.provider.js → Phase 2: Outlook Calendar via Graph API
    google.provider.js  → Phase 2: Google Calendar API
  auth.service.js       → Factory: AUTH_PROVIDER (local/microsoft/google)
  auth/
    local.provider.js   → Default: email + password + bcrypt
    microsoft.provider.js → Phase 2: Entra ID (OIDC)
    google.provider.js  → Phase 2: Google OAuth2
  pdf.service.js        → PDF generation (approval letters, protocols)
  sla.service.js        → Business days calculation
```

## Factory Template
```javascript
/**
 * AI Service Factory — returns provider based on AI_PROVIDER env var.
 * @module services/ai.service
 */
import { mockProvider } from './ai/mock.provider.js';
import { geminiProvider } from './ai/gemini.provider.js';

const providers = {
  mock: mockProvider,
  gemini: geminiProvider,
};

export function getAIService() {
  const name = process.env.AI_PROVIDER || 'mock';
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown AI_PROVIDER: ${name}`);
  return provider;
}
```

## Provider Interface (all providers must implement)
```javascript
// AI Provider
{ analyzeSub(text) → { summary, flags, score } }

// Email Provider
{ send({ to, subject, html, attachments? }) → void }

// Storage Provider
{ upload(file, path) → url, download(path) → stream, delete(path) → void }

// Calendar Provider
{ createEvent({ title, date, time, attendees, location, body }) → eventId }
{ updateEvent(eventId, changes) → void }
{ deleteEvent(eventId) → void }

// Auth Provider
{ validateCredentials(email, password) → user }          // LOCAL only
{ getAuthUrl(redirectUri) → url }                         // SSO: redirect URL
{ handleCallback(code, redirectUri) → { email, name, externalId } }  // SSO: exchange code
{ findOrCreateUser(ssoProfile) → user }                   // SSO: lookup/create in DB
```

## Auth Provider Pattern (SSO-Ready)
```
services/
  auth.service.js          → Factory: AUTH_PROVIDER (local/microsoft/google)
  auth/
    local.provider.js      → Default: email + password + bcrypt
    microsoft.provider.js  → Phase 2: Entra ID / OIDC
    google.provider.js     → Phase 2: Google OAuth2
```
- LOCAL provider: validates password against bcrypt hash in users table
- SSO providers: redirect to external login → callback → find user by email → create JWT
- **Users table is ALWAYS the authority for role, department, isActive**
- SSO only handles "who is this person?" — our DB handles "what can they do?"
- Mixed mode: same institution can have LOCAL + SSO users

## Document Storage Rules
Two document types tracked in `documents` table:
- **UPLOADED**: researcher files → `uploads/submissions/{subId}/{filename}`
- **GENERATED**: system PDFs → `generated/{type}/{id}/{filename}`
- Generated docs are IMMUTABLE — never modify after creation
- All files validated: max 20MB, magic bytes check, allowed MIME types

## Rules
- NEVER import a specific provider directly in controllers
- ALWAYS use the factory function
- ALWAYS have a mock provider for dev
- Provider swap = change 1 env var, restart server
