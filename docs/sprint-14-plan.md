# Sprint 14 — Reviewer Checklist System
**Implementation Plan**

**Sprint Duration:** 6 days (April 29 – May 4, 2026)  
**Release Tag:** v1.4.0  
**Owner:** Claude  
**Status:** Ready to begin

---

## Overview

Sprint 14 implements a **dynamic reviewer checklist system** that replaces the simple ReviewForm component. The system enables:

1. **Template Management** — Admins define checklist templates (sections, items, answer types)
2. **Multi-Track Support** — Templates can target specific research tracks (nullable = all tracks)
3. **Reviewer Workflow** — Reviewers complete dynamic checklists with different answer types (Adequacy, Yes/No, Yes/No+Problem)
4. **Flexible Recommendations** — 5 recommendation types: EXEMPT, APPROVED, APPROVED_CONDITIONAL, REVISION_REQUIRED, REJECTED
5. **Optional Sections** — Exempt consent & minors sections with conditional logic

---

## Key Design Decisions

✅ **No reviewer signature** — Signatures handled separately in approval workflow  
✅ **Multi-answer types** — ADEQUACY (green/red), YES_NO (binary), YES_NO_PROBLEM (binary + flag)  
✅ **Track-nullable templates** — NULL = applies to all tracks  
✅ **DRAFT/SUBMITTED states** — Separates from old SUBMITTED enum  
✅ **Conditional items** — JSON-based conditional logic for show/hide  
✅ **Item snapshots** — Store item_code in responses for audit stability  
✅ **Separate recommendation field** — Decoupled from old "recommendation" string  

---

## Database Schema

5 new tables (migration ready: `20260428000002_add_reviewer_checklist`):

### reviewer_checklist_templates
- UUID id
- name, name_en (template name)
- version (1, 2, 3...)
- **track (nullable)** — NULL = all tracks, "clinical", "genetic", etc.
- is_active, is_published, published_at
- created_at, updated_at
- **Index:** (is_active, track)

### reviewer_checklist_sections
- UUID id, template_id (FK, CASCADE)
- code, title, title_en
- description (optional)
- **answer_type:** ADEQUACY | YES_NO | YES_NO_PROBLEM
- yes_is_problem (boolean — if YES means problem)
- order_index
- **Index:** (template_id, order_index)

### reviewer_checklist_items
- UUID id, section_id (FK, CASCADE)
- code, label, label_en
- help_text, help_text_en (optional)
- order_index, is_required, requires_details
- conditional (JSONB — show/hide rules)
- is_active
- **Index:** (section_id, order_index, is_active)

### reviewer_checklist_reviews
- UUID id
- submission_id (FK → submissions)
- reviewer_id (FK → users)
- template_id (FK → templates)
- **status:** DRAFT | SUBMITTED
- **recommendation:** EXEMPT | APPROVED | APPROVED_CONDITIONAL | REVISION_REQUIRED | REJECTED
- general_note (TEXT)
- exempt_consent_requested, exempt_consent_reviewer_view
- minors_both_parents_exempt, minors_exempt_reviewer_view
- submitted_at, created_at, updated_at
- **Unique:** (submission_id, reviewer_id)
- **Index:** (submission_id, status), (reviewer_id, status)

### reviewer_checklist_responses
- UUID id
- review_id (FK → reviews, CASCADE)
- item_id (FK → items)
- item_code (snapshot for audit)
- **answer:** ADEQUATE | INADEQUATE | YES | NO | NA
- details (optional — for items with requires_details)
- created_at, updated_at
- **Unique:** (review_id, item_id)
- **Index:** (review_id)

---

## Implementation Phases

### Phase 1: Backend Services (Day 1-2)
**Files to create:**
- `backend/src/services/checklist.service.js` — Template CRUD, review management
- `backend/src/controllers/checklists.controller.js` — 6 endpoints
- `backend/src/routes/checklists.routes.js` — API routes + Zod schemas
- `backend/src/services/checklistTemplate.service.test.js` — Unit tests

**Endpoints:**
1. `GET /api/checklists/templates` — List all templates (admin)
2. `POST /api/checklists/templates` — Create template (admin)
3. `PUT /api/checklists/templates/:id` — Update template (admin)
4. `POST /api/checklists/templates/:id/publish` — Publish template (admin)
5. `POST /api/checklists/reviews` — Start review for submission (auto-assigned)
6. `PUT /api/checklists/reviews/:id` — Update review responses (reviewer)
7. `POST /api/checklists/reviews/:id/submit` — Submit completed review (reviewer)

**Features:**
- Prisma migrations (no manual DB setup needed)
- Seed: Standard 2026 template with 30 items
- Zod validation on all inputs
- Audit logging (checklist.*, review.*)
- RBAC: ADMIN for templates, REVIEWER for reviews, SECRETARY to assign

### Phase 2: Admin Template Management UI (Day 2)
**Files to create:**
- `frontend/src/pages/admin/ChecklistTemplatesPage.jsx` — Template list + editor
- `frontend/src/components/checklist/TemplateEditor.jsx` — Drag-drop sections/items
- `frontend/src/components/checklist/SectionCard.jsx` — Section editor
- `frontend/src/components/checklist/ItemEditor.jsx` — Item editor modal

**Features:**
- List templates with active/published status
- Create/edit templates with sections and items
- Drag-reorder sections and items
- Answer type picker (ADEQUACY/YES_NO/YES_NO_PROBLEM)
- Track selection (dropdown + NULL = all)
- Publish workflow (save → test → publish)
- Responsive grid layout

### Phase 3: Reviewer Checklist UI (Day 3-4)
**Files to create:**
- `frontend/src/pages/reviewer/ChecklistPage.jsx` — Review page (replaces ReviewForm)
- `frontend/src/components/checklist/ChecklistForm.jsx` — Checklist form builder
- `frontend/src/components/checklist/ChecklistSection.jsx` — Section renderer
- `frontend/src/components/checklist/ChecklistItem.jsx` — Item renderer (3 answer types)
- `frontend/src/components/checklist/RecommendationPanel.jsx` — 5-option recommendation
- `frontend/src/components/checklist/GeneralNoteField.jsx` — Textarea for general notes
- `frontend/src/components/checklist/ConditionalSections.jsx` — Exempt consent & minors

**Features:**
- Load active template for submission's track
- Render sections with items
- 3 answer types with different UI:
  - ADEQUACY: Green "Adequate" / Red "Inadequate" buttons
  - YES_NO: Green "Yes" / Gray "No" buttons
  - YES_NO_PROBLEM: Green "Yes" / Red "No (Problem)" / Gray "NA"
- Optional details field when requires_details=true
- Progress bar (items completed / total items)
- Recommendation picker (5 options)
- General notes textarea
- Conditional sections (show/hide exempt + minors based on submission data)
- Save as draft + Submit buttons
- Mobile-responsive (375px+)

### Phase 4: Integration & Workflow (Day 4-5)
**Files to modify:**
- `frontend/src/pages/reviewer/AssignmentsPage.jsx` — Link to new ChecklistPage
- `frontend/src/pages/secretary/SubmissionDetailPage.jsx` — Show review status
- `backend/src/controllers/submissions.controller.js` — Create checklist on reviewer assignment
- `App.jsx` — Route to /reviewer/submissions/:id/checklist

**Features:**
- Auto-create draft checklist when reviewer assigned
- Status badge: DRAFT / SUBMITTED
- Link to checklist from assignments list
- Checklist status on submission detail page
- Prevent duplicate assignment (unique constraint)
- Auto-transition submission status on checklist submission

### Phase 5: Internationalization (Day 5)
**Files to modify:**
- `frontend/src/locales/he.json` — 50+ keys
- `frontend/src/locales/en.json` — 50+ keys

**Keys:**
- checklists.* namespace (templates, items, recommendations, etc.)
- recommendations.* (EXEMPT, APPROVED, etc.)
- adequacy.* (adequate, inadequate)
- admin.checklist* (admin management)

### Phase 6: Documentation & Testing (Day 6)
**Files to create:**
- `docs/API-CHECKLISTS.md` — API reference
- `docs/sprint-14-user-guide.md` — Admin & reviewer workflow
- `docs/sprint-14-deployment-checklist.md` — Deployment steps
- `docs/sprint-14-report.md` — Final sprint report

**Testing:**
- Unit tests on service layer
- Manual QA: Create template → Publish → Assign reviewer → Complete checklist
- Accessibility: WCAG 2.2 AA
- Security: RBAC on all endpoints
- Responsive: 375px (mobile), 768px (tablet), 1280px (desktop)

---

## Estimated Effort

| Phase | Task | Days | Owner |
|-------|------|------|-------|
| 1 | Backend services + tests | 1.5 | Backend |
| 2 | Admin UI | 1 | Frontend |
| 3 | Reviewer checklist UI | 1.5 | Frontend |
| 4 | Integration + workflow | 0.5 | Full-stack |
| 5 | i18n + localization | 0.5 | Frontend |
| 6 | Documentation + QA | 1 | All |
| — | **Total** | **6 days** | — |

---

## Success Criteria

- [x] Database schema created (migration ready)
- [x] Seed data defined (30 items)
- [ ] Backend API endpoints functional (6 endpoints)
- [ ] Unit tests passing (service layer)
- [ ] Admin can create/edit/publish templates
- [ ] Reviewer can complete checklists with 3 answer types
- [ ] Recommendations properly stored + displayed
- [ ] Conditional sections work (exempt, minors)
- [ ] Auto-checklist creation on reviewer assignment
- [ ] Status transitions work (DRAFT → SUBMITTED)
- [ ] i18n complete (50+ keys, He + En)
- [ ] Mobile responsive (375px+)
- [ ] WCAG 2.2 AA compliant
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for deployment

---

## Risk Assessment

| Risk | Likelihood | Mitigation | Status |
|------|-----------|-----------|--------|
| 5 new tables too complex | Low | Schema pre-designed, seed prepared | ✅ |
| Conditional logic bugs | Medium | Thorough testing on exempt/minors sections | TBD |
| Performance on large reviews | Low | Indexes on (submission_id, reviewer_id) | ✅ |
| i18n key mismatches | Low | Keys reviewed before implementation | TBD |
| Mobile responsiveness | Low | Mobile-first design from start | TBD |

**Overall Risk Level:** 🟡 **MEDIUM** (conditional logic)

---

## Next Steps After Sprint 14

### Sprint 15 (Optional)
1. **Chairman Approval Workflow** — Replace old decision form with new UI
2. **Chairman Summary Page** — Dashboard showing review recommendations
3. **Approval Letter Auto-Population** — Include checklist results in PDF

### Future Enhancements
1. **Template Versioning** — Show version history + rollback
2. **Checklist Analytics** — Report on common issues found
3. **Template Sharing** — Share templates between institutions
4. **Bulk Assignment** — Assign same reviewer to multiple submissions

---

## Approval

- [x] Plan reviewed
- [x] Database schema approved
- [x] User workflow approved
- [ ] Ready to implement

**Start Date:** April 29, 2026  
**Expected Completion:** May 4, 2026  
**Release Tag:** v1.4.0

