# Sprint 13 — User Guide
**Form Duplication & Instructions Editor**

---

## For Secretaries & Admins

### 📋 New Features in This Release

#### 1. **Form Duplication** (Quick Copy)
Quickly duplicate an existing form instead of building from scratch.

#### 2. **Form Instructions** (Guidance for Researchers)
Add markdown-formatted instructions that appear when researchers fill a form.

#### 3. **Attachments List** (Required Documents)
Mark which documents researchers must attach when submitting.

---

## How to Duplicate a Form

### Steps
1. Go to **ניהול טפסים** (Form Library) at `/secretary/forms`
2. Find the form you want to copy
3. Click the **שכפל** (Duplicate) button on the card
4. A dialog appears:
   ```
   שכפול טופס
   הטופס יישכפל כטיוטה חדשה
   
   ☑ כלול הוראות
   ☑ כלול רשימת קבצים
   
   [ביטול] [שכפל]
   ```
5. **Uncheck options** if you don't want to copy instructions or attachments
6. Click **שכפל** button
7. New draft form appears at the top of the list with name: `{Original Name} - העתק`

### Example
- Original: "שאלון למגיש בקשה — מרץ 2026" (version 1, published)
- Duplicate: "שאלון למגיש בקשה — מרץ 2026 - העתק" (version 1, **draft**)

### Edit After Duplication
1. Click the **עריכה** (Edit) button on the new draft form
2. Make changes to fields, name, instructions, or attachments
3. Click **שמור** (Save)
4. Click **פרסם** (Publish) when ready

---

## How to Add/Edit Form Instructions

### In the Form Builder

1. Go to **ניהול טפסים** → click **עריכה** (Edit) on a draft form
2. You'll see the form builder with **fields** visible
3. Look for the **הוראות וקבצים** (Instructions & Attachments) tab
   - *Location: Usually next to the "שדות" (Fields) tab, or in a dropdown*
4. **Add instructions** in Hebrew:
   - Paste text or write markdown
   - Use `# Heading`, `- Bullet`, `**bold**`, etc.
5. **Add instructions** in English (same content, different language)
6. **Manage attachments**:
   - Add row: click "+ הוסף קובץ" (Add Attachment)
   - Columns: Name (Hebrew), Name (English), Required?, Accepted Types, Note
7. Click **שמור** (Save)

### Example Instructions (Markdown)
```markdown
# הוראות למילוי הטופס

יקר חוקר/ת,

לצורך הגשת בקשה יש למלא את כל השדות המסומנים ב-*

## קבצים נדרשים

- **פרוטוקול מחקר** (עד 2 עמודים)
- **טופס הסכמה מדעת**
```

### Attachments Table Columns
| Column | Example | Notes |
|--------|---------|-------|
| Name (HE) | "פרוטוקול מחקר" | Display name in Hebrew |
| Name (EN) | "Research Protocol" | Display name in English |
| Required? | ✓ (checked) | Marks with asterisk (*) on submit page |
| Accepted Types | PDF, DOC, DOCX | Comma-separated file extensions |
| Note | "עד 2 עמודים" | Optional hint for researchers |

---

## How Researchers See Instructions

### On the Submission Page (`/submissions/new`)

When a researcher loads a form to fill it out:

1. **At the top** (before any fields):
   ```
   ℹ️ הוראות וקבצים מצורפים  [▼]
   ```
   
2. **Collapsed by default** — click to expand and see:
   - **Markdown instructions** (formatted, readable)
   - **Required attachments list** (with required/optional indicators)
   - **Upload note**: "Files are uploaded using the Documents button below the form"

3. **Accordion behavior**:
   - Click again to collapse (saves screen space on mobile)
   - Instructions always accessible without scrolling
   - Mobile-friendly: doesn't take up unnecessary space

### Example (Researcher View)
```
┌─ ℹ️ הוראות וקבצים מצורפים ────────────────────────┐
│                                                      │
│  # שאלון למגיש הבקשה                              │
│  יקר/ה חוקר/ת,                                     │
│  לצורך הגשת בקשה יש למלא את כל השדות...          │
│                                                      │
│  ## קבצים נדרשים                                   │
│  • פרוטוקול מחקר *                                 │
│  • טופס הסכמה מדעת *                              │
│                                                      │
└──────────────────────────────────────────────────────┘

[1. פרטי המחקר]
...
```

---

## Best Practices

### Instructions Writing
✅ **DO:**
- Use **clear, simple language** (avoid jargon)
- Break into sections with headers (`# Main`, `## Sub`)
- Use bullet points for lists: `- Item 1`
- Keep under 500 words (users don't read long instructions)
- Translate accurately (don't just use Google Translate)

❌ **DON'T:**
- Use HTML or special characters (stick to markdown)
- Paste large tables (use bullets instead)
- Leave blank instructions (they won't show accordion)
- Duplicate content across English/Hebrew

### Attachments List
✅ **DO:**
- Mark **required** documents clearly
- Use standard file extensions: `pdf`, `doc`, `docx`, `jpg`, `png`, `xlsx`
- Add **brief notes** for clarification: "עד 2 עמודים" (up to 2 pages)
- List in **logical order** (most important first)

❌ **DON'T:**
- Add too many attachments (keep to 5-7 max)
- Use obscure formats (PDF and DOC are safest)
- Leave notes blank if there's guidance needed

### Form Duplication Workflow
✅ **DO:**
- Duplicate a similar form to save time
- Uncheck "כלול הוראות" if you're rewriting instructions
- Change the form name to something unique
- Test the form **before publishing**

❌ **DON'T:**
- Duplicate a published form (it stays published) — unpublish first
- Forget to edit the name (creates confusion with "Hebrew - Heritage")
- Use duplicate for template management (not the right tool for versioning)

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save form | `Ctrl+S` (or `Cmd+S` on Mac) |
| Expand accordion | `Space` (when focused) |
| Next form | `→` (right arrow, in library) |
| Previous form | `←` (left arrow, in library) |

---

## Common Questions

### Q: Can researchers edit instructions after the form is published?
**A:** No. Only secretaries/admins can edit instructions. Researchers see them as read-only.

### Q: If I change instructions, does it affect already-submitted forms?
**A:** No. Historical submissions keep their original instructions. Only **new** submissions see the updated instructions.

### Q: Can I duplicate an archived form?
**A:** No. The duplicate button only appears on active (non-archived) forms.

### Q: What happens to instructions if I uncheck "כלול הוראות" during duplication?
**A:** The new form will have **no instructions**. You'll need to add them manually in the form builder.

### Q: Can I use HTML in instructions?
**A:** No, only **markdown**. HTML will be displayed as plain text, not rendered.

### Q: Can researchers download the instructions as a PDF?
**A:** Currently no, but they can print the page (`Ctrl+P`). Instructions are on the page, so they print correctly.

---

## Troubleshooting

### Issue: "שכפול טופס" button doesn't appear
**Cause:** Form is archived or you're not SECRETARY/ADMIN role
**Fix:** Restore the form first, or contact your admin

### Issue: Instructions don't show on submit page
**Cause:** Instructions are empty or form didn't save properly
**Fix:** Go back to form builder, check Instructions tab has content, re-save

### Issue: Markdown isn't rendering (showing `# Header` as plain text)
**Cause:** There's an error in markdown syntax
**Fix:** Check for missing spaces after `#`, unclosed `**bold**`, etc.

### Issue: Attachments list shows but without names
**Cause:** Field wasn't saved properly
**Fix:** Re-edit the form, fill Name (HE) and Name (EN), save again

---

## Support

- **Technical issues**: Contact your admin or file a ticket
- **Feature requests**: Suggest on Slack #ethicflow-feedback
- **Urgent**: Escalate to @אדמין (Admin) on Slack

**Version:** Sprint 13 (v1.3.0)  
**Last Updated:** 2026-04-28
