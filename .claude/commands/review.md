---
name: review
description: Review recent changes for quality, security, and adherence to coding rules
---

Review all files changed since the last commit. For each file check:

1. **JSDoc:** Every function has JSDoc with @param and @returns?
2. **File header:** File has a header comment explaining its role?
3. **Function length:** No function exceeds 30 lines?
4. **Validation:** API endpoints validate input with Zod?
5. **Error handling:** Controllers wrapped in try/catch → next(error)?
6. **Auth:** Routes have authenticate + authorize middleware?
7. **Security:** No hardcoded secrets, passwords, or API keys?
8. **Naming:** English code, Hebrew UI strings?

Report findings as a checklist. If all pass → "✅ Ready to commit". If issues → list them and offer to fix.
