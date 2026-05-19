# בקשה ל-IT של JCT — הרשאת Entra ליצירת App Registrations

**נמען:** מנהל Entra ID בטננט `acad.jct.ac.il` (`7b410031-6333-4080-9e61-afdbd57b3bd9`)  
**מבקש:** שמואל גולדברג, `goldb@acad.jct.ac.il`  
**משך זמן:** ~30 שניות

---

## רקע

אני פורס מערכת EthicFlow ב-Subscription "Azure plan" של JCT. תודה על רישום Postgres provider אתמול — זה עבד.

אני נתקל ב-`Insufficient privileges to complete the operation` כשאני מנסה ליצור Service Principal עבור CI/CD:

```text
ERROR: Directory permission is needed for the current user to register the application.
Original error: Insufficient privileges to complete the operation.
```

זה כי בטננט הזה משתמשים רגילים לא יכולים ליצור App Registrations.

---

## הבקשה (חד-פעמית)

הוסיפו ל-`goldb@acad.jct.ac.il` את ה-Built-in Entra Role הבא:

- **`Application Developer`** (`cf1c38e5-3621-4004-a7cb-879624dced7c`)

### דרך פורטל

1. https://entra.microsoft.com → Identity → Roles & admins → All roles
2. חפש `Application Developer` → לחץ עליו
3. **Add assignments** → הוסף את `goldb@acad.jct.ac.il`
4. Type: **Active**, Duration: **Permanent** (או מספר חודשים, לפי המדיניות שלכם)

### דרך CLI

```powershell
$user = az ad user show --id "goldb@acad.jct.ac.il" --query id -o tsv
az rest --method POST `
  --uri "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments" `
  --body (@{
    "@odata.type" = "#microsoft.graph.unifiedRoleAssignment"
    principalId   = $user
    roleDefinitionId = "cf1c38e5-3621-4004-a7cb-879624dced7c"
    directoryScopeId = "/"
  } | ConvertTo-Json) `
  --headers "Content-Type=application/json"
```

---

## מה זה Application Developer

מה כן:
- ליצור App Registrations חדשות (Service Principals).
- לערוך App Registrations **שאני יצרתי**.
- להוסיף API permissions לאפליקציות שלי.

מה לא:
- לערוך/למחוק App Registrations של אחרים.
- לתת **Admin Consent** (זה רק Global Admin / Privileged Role Admin יכולים) — נבקש זאת בפעולה הבאה (ראה למטה).
- לראות נתוני משתמשים אחרים.

זוהי **הרשאה מינימלית** ובטוחה. רשמית מתועדת ע"י Microsoft כ-"Allows creating application registrations independent of the 'Users can register applications' setting".

---

## פעולה עתידית (בעוד ~3-5 ימים, אבקש בנפרד)

לאחר שאצור 3 App Registrations עבור EthicFlow:
- `EthicFlow SSO` — Delegated: openid, profile, email, User.Read
- `EthicFlow Mail` — Application: Mail.Send (scope: רק `ethicscommittee@jct.ac.il`)
- `EthicFlow Calendar` — Application: Calendars.ReadWrite (scope: רק `ethicscommittee@jct.ac.il`)

אבקש בנפרד אז את **Admin Consent** לכל אחת מהן (זה מצריך Global Admin של JCT).

---

## אימות

לאחר שהתפקיד יוקצה, אריץ:

```powershell
az rest --method GET --uri "https://graph.microsoft.com/v1.0/me/memberOf" --query "value[].displayName" -o tsv
```

ואצפה לראות `Application Developer` ברשימה.

---

תודה!  
שמואל גולדברג — `goldb@acad.jct.ac.il`
