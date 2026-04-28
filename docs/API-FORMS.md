# Forms API Reference
**Sprint 13 & Earlier**

---

## Endpoints Summary

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/forms` | SECRETARY, ADMIN | List all forms (draft/published/archived) |
| GET | `/api/forms/active` | Authenticated | Get the single active form |
| GET | `/api/forms/available` | Authenticated | List published+active forms (metadata) |
| GET | `/api/forms/available/:id` | Authenticated | Get published+active form (full) |
| GET | `/api/forms/:id` | SECRETARY, ADMIN | Get single form by ID |
| POST | `/api/forms` | SECRETARY, ADMIN | Create new draft form |
| PUT | `/api/forms/:id` | SECRETARY, ADMIN | Update draft form schema |
| POST | `/api/forms/:id/publish` | SECRETARY, ADMIN | Publish form (make active) |
| POST | `/api/forms/:id/archive` | SECRETARY, ADMIN | Archive form (soft delete) |
| POST | `/api/forms/:id/restore` | SECRETARY, ADMIN | Restore archived form to draft |
| **POST** | **`/api/forms/:id/duplicate`** | **SECRETARY, ADMIN** | **[NEW] Duplicate form** |
| **PUT** | **`/api/forms/:id/instructions`** | **SECRETARY, ADMIN** | **[NEW] Update instructions** |

---

## New Endpoints (Sprint 13)

### POST /api/forms/:id/duplicate
Duplicate an existing form as a new draft. Copies schema, and optionally instructions + attachments.

**Request:**
```json
POST /api/forms/abc-123/duplicate
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "includeInstructions": true,
  "includeAttachments": true
}
```

**Parameters:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeInstructions` | boolean | `true` | Copy instructionsHe + instructionsEn to new form |
| `includeAttachments` | boolean | `true` | Copy attachmentsList to new form |

**Response (200 OK):**
```json
{
  "form": {
    "id": "new-uuid-456",
    "name": "שאלון למגיש בקשה — מרץ 2026 - העתק",
    "nameEn": "Researcher Questionnaire — March 2026 - Copy",
    "version": 1,
    "status": "draft",
    "isActive": true,
    "isPublished": false,
    "schemaJson": { /* same as original */ },
    "instructionsHe": "...",
    "instructionsEn": "...",
    "attachmentsList": [ /* copy of original */ ],
    "duplicatedFromId": "abc-123",
    "createdAt": "2026-04-28T...",
    "updatedAt": "2026-04-28T..."
  }
}
```

**Error Responses:**
- `404 Not Found` — Form with ID doesn't exist
- `400 Bad Request` — Invalid request body (Zod validation failed)
- `403 Forbidden` — User is not SECRETARY or ADMIN

**Audit Log:**
- Action: `form.duplicate`
- Entity: `FormConfig`
- Details: includes original form ID and duplication options

---

### PUT /api/forms/:id/instructions
Update form instructions (markdown, Hebrew/English) and attachments list.

**Request:**
```json
PUT /api/forms/abc-123/instructions
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "instructionsHe": "# הוראות\nיקר חוקר/ת...",
  "instructionsEn": "# Instructions\nDear Researcher...",
  "attachmentsList": [
    {
      "id": "protocol",
      "name": "פרוטוקול מחקר",
      "nameEn": "Research Protocol",
      "required": true,
      "acceptedTypes": ["pdf", "doc", "docx"],
      "note": "עד 2 עמודים"
    }
  ]
}
```

**Parameters:**
| Field | Type | Max | Description |
|-------|------|-----|-------------|
| `instructionsHe` | string | 20,000 chars | Markdown instructions in Hebrew (optional) |
| `instructionsEn` | string | 20,000 chars | Markdown instructions in English (optional) |
| `attachmentsList` | array | 100 items | List of required/optional attachments (optional) |

**Attachment Object:**
```typescript
{
  id: string,              // unique identifier (e.g., "protocol")
  name: string,            // display name in Hebrew (1-500 chars)
  nameEn: string,          // display name in English (1-500 chars)
  required: boolean,       // marks with asterisk on submit form
  acceptedTypes: string[], // file extensions (e.g., ["pdf", "doc", "docx"])
  note?: string            // optional hint for researchers
}
```

**Response (200 OK):**
```json
{
  "form": {
    "id": "abc-123",
    "instructionsHe": "# הוראות...",
    "instructionsEn": "# Instructions...",
    "attachmentsList": [ /* updated */ ],
    "updatedAt": "2026-04-28T..."
  }
}
```

**Error Responses:**
- `404 Not Found` — Form doesn't exist
- `400 Bad Request` — Validation failed (instructions > 20k chars, invalid attachment structure)
- `403 Forbidden` — User is not SECRETARY or ADMIN

**Audit Log:**
- Action: `form.updateInstructions`
- Entity: `FormConfig`

---

## Form Response Schema

### FormConfig Object
```typescript
{
  // Core fields
  id: string,                          // UUID
  name: string,                        // Display name in Hebrew
  nameEn: string,                      // Display name in English
  version: number,                     // Incrementing version (starts at 1)
  
  // Form schema
  schemaJson: object,                  // Dynamic form structure (sections, fields)
  
  // Sprint 13: Instructions & Attachments
  instructionsHe?: string,             // Markdown instructions in Hebrew
  instructionsEn?: string,             // Markdown instructions in English
  attachmentsList?: object[],          // Required/optional attachment specs
  
  // Status
  status: 'draft' | 'published' | 'archived',
  isActive: boolean,                   // false = archived
  isPublished: boolean,
  publishedAt?: ISO8601DateTime,
  
  // Sprint 13: Duplication
  duplicatedFromId?: string,           // ID of original form (if this is a copy)
  
  // Timestamps
  createdAt: ISO8601DateTime,
  updatedAt: ISO8601DateTime
}
```

---

## Usage Examples

### Example 1: Duplicate a Form
```bash
curl -X POST http://localhost:5000/api/forms/form-001/duplicate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "includeInstructions": true,
    "includeAttachments": true
  }'
```

### Example 2: Update Instructions Only
```bash
curl -X PUT http://localhost:5000/api/forms/form-001/instructions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "instructionsHe": "# הוראות חדשות",
    "instructionsEn": "# New Instructions"
  }'
```

### Example 3: Update Attachments Only
```bash
curl -X PUT http://localhost:5000/api/forms/form-001/instructions \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "attachmentsList": [
      {
        "id": "protocol",
        "name": "פרוטוקול מחקר",
        "nameEn": "Research Protocol",
        "required": true,
        "acceptedTypes": ["pdf", "doc", "docx"],
        "note": "עד 2 עמודים"
      },
      {
        "id": "consent",
        "name": "טופס הסכמה מדעת",
        "nameEn": "Consent Form",
        "required": true,
        "acceptedTypes": ["pdf", "doc", "docx"]
      }
    ]
  }'
```

---

## Authorization & RBAC

### Who Can Duplicate Forms?
- ✅ SECRETARY
- ✅ ADMIN
- ❌ RESEARCHER
- ❌ REVIEWER
- ❌ CHAIRMAN

### Who Can Edit Instructions?
- ✅ SECRETARY
- ✅ ADMIN
- ❌ RESEARCHER
- ❌ REVIEWER
- ❌ CHAIRMAN

### Who Can View Instructions?
- ✅ All authenticated users (on submit page for their own form)

---

## Validation Rules

### instructionsHe / instructionsEn
- **Max length:** 20,000 characters
- **Format:** Plain text + markdown (no HTML)
- **Allowed markdown:** 
  - Headers: `# H1`, `## H2`, `### H3`
  - Bold: `**text**`
  - Italic: `*text*`
  - Lists: `- item`, `1. numbered`
  - Links: `[text](url)`
  - Code blocks: `` `inline` ``

### attachmentsList Items
- **id:** Min 1 char, max 100 (unique within form)
- **name (Hebrew):** Min 1 char, max 500
- **nameEn (English):** Min 1 char, max 500
- **required:** boolean
- **acceptedTypes:** Array of valid extensions
  - Allowed: `pdf`, `doc`, `docx`, `jpg`, `jpeg`, `png`, `xlsx`
  - Max 10 per item
- **note:** Optional, max 500 chars

---

## Changelog

### Sprint 13
- ✨ NEW: `POST /api/forms/:id/duplicate`
- ✨ NEW: `PUT /api/forms/:id/instructions`
- 📊 Schema: Added `instructionsHe`, `instructionsEn`, `attachmentsList`, `duplicatedFromId` to FormConfig

### Sprint 6+
- Existing endpoints (create, publish, archive, restore, list, get)

---

## Related Documentation

- **User Guide:** [sprint-13-user-guide.md](./sprint-13-user-guide.md)
- **Deployment:** [sprint-13-deployment-checklist.md](./sprint-13-deployment-checklist.md)
- **Database Schema:** See `prisma/schema.prisma` for FormConfig model
