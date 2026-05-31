# בקשה ל-IT של JCT — Phase 3 + 4 (Microsoft Apps, DNS)

**נמען:** ג'רמי ליונס + IT team
**מבקש:** שמואל גולדברג, `goldb@acad.jct.ac.il`
**תאריך:** 24 במאי 2026
**מתי לשלוח:** אחרי ש-`B1 VMs` quota מאושר ו-Phase 2 (Bicep deploy) רץ. כרגע מוקדם — שולחים רק כשמגיעים.

---

## רקע מהיר

EthicFlow = מערכת ועדת אתיקה אקדמית של JCT (`ethics.jct.ac.il`). בסיום Phase 2 ה-baseline של Azure פרוס ב-tenant האקדמי (`acad.jct.ac.il`, `7b410031-...`).

עכשיו אני זקוק לשתי פעולות מוגדרות מצדכם:

1. יצירת **2 App Registrations** ב-tenant `jct.ac.il` עבור Mail.Send + Calendars.ReadWrite, והעברת ה-credentials אליי. (~15 דקות)
2. הוספת **2 CNAME + 2 TXT** ל-DNS של `jct.ac.il` (אחרי Phase 3, ~10 דקות)

הכל ב-1 path ברור. אין אופציות לבחור. הפרטים למטה.

---

## למה זה דרוש: ההחלטות שכבר התקבלו

| נושא | החלטה | תוצאה ל-IT |
|---|---|---|
| השולח של מיילי המערכת | `ethicscommittee@jct.ac.il` (branding מקצועי) | Mail App חייבת להיווצר ב-`jct.ac.il` (אני בלי הרשאות שם) |
| יומן פגישות ועדה | יומן של `ethicscommittee@jct.ac.il` | Calendar App חייבת להיווצר ב-`jct.ac.il` |
| SSO (login של חוקרים/סוקרים) | רוב המשתמשים `@acad.jct.ac.il` → SSO ב-`acad.jct.ac.il` | **כלום ל-IT** — אני יוצר לבד עם PIM `Application Developer` שכבר ניתן לי |
| משתמשי מיעוט `@jct.ac.il` (אם יש) | לא נתמכים בשלב זה | **כלום ל-IT** — אם בעתיד יידרשו, ניצור בקשה נפרדת |
| Domain `ethics.jct.ac.il` ו-`api.ethics.jct.ac.il` | זה zone שלכם | DNS records (סעיף ב' למטה) |

---

## א. יצירת 2 App Registrations ב-tenant `jct.ac.il`

### צעד 1: וידוא שהתיבה `ethicscommittee@jct.ac.il` קיימת

```powershell
Get-Mailbox -Identity "ethicscommittee@jct.ac.il" | `
  Select Name, RecipientTypeDetails, UserPrincipalName, EmailAddresses, AccountDisabled
```

תוצאה מצופה: התיבה קיימת, סוג Shared Mailbox (חסכון רישיון), Active.

אם התיבה לא קיימת — צרו אותה כ-Shared Mailbox רגיל לפני שממשיכים.

### צעד 2: יצירת `EthicFlow Mail` App Registration

**Portal:** Entra ID → App registrations → New registration

```text
Name:             EthicFlow Mail
Supported account types:  Accounts in this organizational directory only (single-tenant)
Redirect URI:     (leave empty — application-only flow)
```

לחצו **Register**.

**הוספת הרשאה:**
1. בתוך ה-App החדשה: API permissions → Add a permission → Microsoft Graph → **Application permissions** → `Mail.Send`
2. אחרי הוספה: לחצו **"Grant admin consent for jct.ac.il"** (כפתור ירוק)

**יצירת secret:**
1. Certificates & secrets → New client secret
2. Description: `ethicflow-mail-prod`
3. Expires: **24 months**
4. **שמרו את ה-`Value` מיד** — לא ה-`Secret ID`. ה-Value מוצג פעם אחת בלבד.

### צעד 3: יצירת `EthicFlow Calendar` App Registration

זהה לצעד 2 עם השינויים הבאים:

```text
Name:                   EthicFlow Calendar
API permission:         Microsoft Graph → Application → Calendars.ReadWrite
Secret description:     ethicflow-calendar-prod
Secret expires:         24 months
```

זכרו: **Grant admin consent** ושמירת ה-Value של ה-secret.

### צעד 4: הגבלת ה-Apps רק לתיבת `ethicscommittee@jct.ac.il` — **RBAC for Applications**

ברירת המחדל של `Mail.Send` / `Calendars.ReadWrite` מאפשרת ל-App לפעול בשם **כל תיבה ב-tenant**. אנחנו רוצים להגביל את שתי ה-Apps רק לתיבה היחידה שהן צריכות.

> **הערה חשובה (May 2026):** `Application Access Policies` (`New-ApplicationAccessPolicy`) **בדרך ל-deprecation** ע"י Microsoft. הגישה המודרנית והמומלצת היא **Role Based Access Control (RBAC) for Applications** ב-Exchange Online. הקטע הבא משתמש בגישה החדשה — אין צורך ב-Distribution Group, ההגבלה היא לפי Management Scope ישירות על התיבה.
>
> **קריאה:** [Role Based Access Control for Applications in Exchange Online](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac)

```powershell
# חיבור ל-Exchange Online + Graph (Graph לצורך שליפת ObjectId של ה-Enterprise Apps)
Connect-ExchangeOnline -UserPrincipalName admin@jct.ac.il
Connect-MgGraph -TenantId "<jct.ac.il tenant id>" -Scopes "Application.Read.All"

# 1. שליפת ה-Service Principal ObjectIds (שונה מ-App Registration ObjectId)
$mailApp = Get-MgServicePrincipal -Filter "appId eq '<EthicFlow Mail appId>'"
$calApp  = Get-MgServicePrincipal -Filter "appId eq '<EthicFlow Calendar appId>'"

Write-Host "Mail SP ObjectId:     $($mailApp.Id)"
Write-Host "Calendar SP ObjectId: $($calApp.Id)"

# 2. רישום ה-Apps כ-Service Principals פנימיים ב-Exchange
#    (אם Grant admin consent כבר רץ — ייתכן שהם כבר רשומים; אם כן הפקודה תזרוק שגיאה
#     "already exists" — אפשר להתעלם)
New-ServicePrincipal -AppId $mailApp.AppId -ObjectId $mailApp.Id -DisplayName "EthicFlow Mail"
New-ServicePrincipal -AppId $calApp.AppId  -ObjectId $calApp.Id  -DisplayName "EthicFlow Calendar"

# 3. יצירת Management Scope שמגביל לתיבת ועדת האתיקה בלבד
New-ManagementScope -Name "EthicFlow-EthicsCommittee" `
  -RecipientRestrictionFilter "EmailAddresses -eq 'smtp:ethicscommittee@jct.ac.il'"

# 4. שיוך תפקיד Mail.Send ל-Mail App עם ה-Scope
New-ManagementRoleAssignment `
  -App $mailApp.Id `
  -Role "Application Mail.Send" `
  -CustomResourceScope "EthicFlow-EthicsCommittee" `
  -Name "EthicFlow-Mail-Send"

# 5. שיוך תפקיד Calendars.ReadWrite ל-Calendar App עם אותו Scope
New-ManagementRoleAssignment `
  -App $calApp.Id `
  -Role "Application Calendars.ReadWrite" `
  -CustomResourceScope "EthicFlow-EthicsCommittee" `
  -Name "EthicFlow-Calendar-ReadWrite"

# 6. וידוא — צריך להחזיר את התפקיד עם ה-CustomResourceScope = EthicFlow-EthicsCommittee
Get-ManagementRoleAssignment -RoleAssignee $mailApp.Id |
  Format-Table Name, Role, CustomResourceScope
Get-ManagementRoleAssignment -RoleAssignee $calApp.Id |
  Format-Table Name, Role, CustomResourceScope

# 7. בדיקה דינמית — שתי הפקודות צריכות להחזיר AccessCheckResult = Granted
Test-ServicePrincipalAuthorization -Identity $mailApp.Id `
  -Resource "ethicscommittee@jct.ac.il"
Test-ServicePrincipalAuthorization -Identity $calApp.Id `
  -Resource "ethicscommittee@jct.ac.il"

# 8. (אופציונלי — בדיקת negative) ניסיון לגשת לתיבה אחרת — צריך להחזיר Denied
Test-ServicePrincipalAuthorization -Identity $mailApp.Id `
  -Resource "<any-other-mailbox>@jct.ac.il"
```

**יתרונות הגישה החדשה:**
- אין צורך ב-Distribution Group נוסף (`ethicflow-svc@jct.ac.il`) — חוסך אובייקט מיותר
- audit trail טוב יותר ב-Exchange admin center
- ניתן להוסיף תפקידים נוספים (כגון `Application Mail.Read`) בלי לשנות את ה-App registration
- עתידי — Microsoft לא מתכננת deprecation של RBAC

### צעד 5: העברת ה-Credentials אליי

תכניסו לערוץ מאובטח (1Password / KeePass / מייל מוצפן) את הטבלה:

```text
Tenant ID of jct.ac.il:  <tenant-id>

EthicFlow Mail
  Application (client) ID:  <appId>
  Client Secret Value:       <secret value>
  Secret expires:            <date>

EthicFlow Calendar
  Application (client) ID:  <appId>
  Client Secret Value:       <secret value>
  Secret expires:            <date>
```

אני אכניס אותם ישירות ל-Azure Key Vault. אתם לא תראו אותם שוב.

---

## ב. DNS records ב-zone `jct.ac.il` (Phase 4 — לא דחוף עדיין)

אחרי שאחבר custom domains, אשלח לכם את ערכי ה-TXT (64 תווים שאקבל מ-Azure). תוסיפו:

| Record | Type | Name | Value | TTL |
|---|---|---|---|---|
| Validation web | TXT | `asuid.ethics.jct.ac.il` | (אשלח) | 300 |
| Validation api | TXT | `asuid.api.ethics.jct.ac.il` | (אשלח) | 300 |
| Web | CNAME | `ethics.jct.ac.il` | `app-ethics-net-web.azurewebsites.net` | 3600 |
| API | CNAME | `api.ethics.jct.ac.il` | `app-ethics-net-api.azurewebsites.net` | 3600 |

ה-TXT records דרושים רק לוולידציה חד-פעמית של Azure — ניתן למחוק אחרי שה-binding מאושר.

---

## ג. סיכום — Action items

| # | פעולה | מתי | משך |
|---|---|---|---|
| 1 | וידוא תיבה `ethicscommittee@jct.ac.il` (סעיף א צעד 1) | אחרי Phase 2 deploy | 2 דק' |
| 2 | יצירת `EthicFlow Mail` + Grant admin consent + secret (סעיף א צעד 2) | מיד אחרי #1 | 5 דק' |
| 3 | יצירת `EthicFlow Calendar` + Grant admin consent + secret (סעיף א צעד 3) | מיד אחרי #2 | 5 דק' |
| 4 | RBAC for Applications ב-Exchange Online (סעיף א צעד 4) | מיד אחרי #3 | 5 דק' |
| 5 | העברת credentials אליי בערוץ מאובטח (סעיף א צעד 5) | מיד אחרי #4 | 2 דק' |
| 6 | DNS records (סעיף ב) | אחרי Phase 3 (~יומיים אחר כך) | 10 דק' |

**סה"כ:** ~20 דק' עכשיו + 10 דק' עוד יומיים-שלושה.

---

## למה זה דרוש (תזכיר עסקי קצר)

EthicFlow שולחת אוטומטית מ-`ethicscommittee@jct.ac.il`:
- אישורי הגשת בקשות לחוקרים ומזכירת הוועדה
- מינוי סוקר לחבר ועדה
- החלטות (אישור / דחייה / שינויים) לחוקרים
- הזמנות לישיבת ועדה (Calendar events) ליו"ר וחברי ועדה
- תזכורות SLA לפני deadlines

ה-branding חייב להיות `@jct.ac.il` — חוקרים חיצוניים ומוסדות מצפים לזה, לא לדומיין `@acad`.

---

תודה!
שמואל גולדברג — `goldb@acad.jct.ac.il`
