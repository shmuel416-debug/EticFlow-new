# EthicFlow @ JCT — להמשיך בשבוע הבא

> מסמך **קצר ופעיל** עם כל מה שצריך לעשות בסשן הבא כדי להמשיך מאיפה שעצרנו.

## עדכון אחרון (27 במאי 2026, ~15:30)

### 🔄 עדכון מ-IT — Application Access Policies → RBAC for Applications

IT הגיבו לdoc של Phase 3 והבהירו ש-**Application Access Policies** ב-Exchange Online בדרך ל-deprecation, ושצריך להשתמש במקום זאת ב-**Role Based Access Control (RBAC) for Applications**.

עדכנתי את `docs/ops/jct-it-handoff-phase3.md` — צעד 4 (סעיף א):
- ✅ `New-ApplicationAccessPolicy` → `New-ManagementRoleAssignment` + `New-ManagementScope`
- ✅ הוסר הצורך ב-Distribution Group (`ethicflow-svc@jct.ac.il`)
- ✅ ה-scope מוגדר ישירות לפי `RecipientRestrictionFilter` על תיבת `ethicscommittee@jct.ac.il`
- ✅ Validation עבר ל-`Test-ServicePrincipalAuthorization` (במקום `Test-ApplicationAccessPolicy`)
- ✅ דורש `Connect-MgGraph` בנוסף ל-`Connect-ExchangeOnline` (לשליפת Enterprise App ObjectIds)
- ✅ הוסף קישור ל-[Microsoft Learn — RBAC for Applications in Exchange Online](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac)

**ההשפעה על הצד שלי:** אפס — `setup-microsoft-integrations.ps1` רק צורך App IDs + secrets, לא עוסק ב-Exchange RBAC. הסקריפט נשאר כפי שהוא.

**מה עכשיו:** לשלוח ל-IT את הdoc המעודכן, להמתין שירוצו את צעד 4 (RBAC) + יחזירו את ה-credentials.

---

## עדכון קודם (24 במאי 2026, ~22:00)

### ✅ מה שהושלם היום

- ✅ **IT אישרו את ה-quota** של `B1 VMs` ב-East US 2.
- ✅ **what-if עבר נקי** — 21 משאבים `+ Create`, אין `SubscriptionIsOverQuotaForSku`.
- ✅ **Phase 2 הושלמה** — `deploy-azure-baseline.ps1` רץ ~13 דק' (Postgres = הצוואר בקבוק). כל 12 המשאבים ב-`Succeeded`.
- ✅ **Bicep cleanup** — תיקון 6 warnings במ-`main.bicep`:
  - `minimumTlsVersion` → `minTlsVersion` ב-2 App Services (היה BCP037, מתעלם בשקט — עכשיו TLS 1.2 נאכף בפועל).
  - 5 שימושים ב-`parent` property במקום בנייה ידנית של שמות hierarchical (`dbUrlSecret`, `postgresDnsLink`, `postgresDatabase`, `apiStorageMounts`, `apiVnetIntegration`).
  - שימוש ב-`storage.listKeys()` במקום `listKeys(storage.id, storage.apiVersion)` (use-resource-symbol-reference).
  - Re-deploy רץ ~3.5 דק'. אומת ש-`minTlsVersion: 1.2` נאכף בפועל בשתי ה-App Services.
- ✅ **Phase 5 prep** — הוספת `build-only` mode ל-`.github/workflows/deploy-azure.yml`. מאפשר לאמת build+push ל-ACR בלי deploy/smoke (שיכשל בלי SSO credentials מ-Phase 3).
- ✅ **Phase 3 prep** — שכתוב `setup-microsoft-integrations.ps1` לתרחיש היברידי:
  - יוצר רק את `EthicFlow SSO` ב-tenant הנוכחי (acad).
  - מקבל את ה-Mail/Calendar credentials כפרמטרים (יסופקו ע"י IT).
  - כותב את שלושת ה-client secrets ל-Key Vault עם prefix `ethicflow-prod` (תואם ל-`set-azure-api-keyvault-settings.ps1`).
  - מעדכן App Service appSettings עם ה-public IDs ו-tenant IDs (כולל overrides ל-`MICROSOFT_*_TENANT_ID` שב-Bicep מצביעים ל-acad).
  - DryRun הצליח עם 8 settings צפויים.

### Outputs של Phase 2 (לשימוש ב-Phase 3-5)

| משאב | ערך |
|---|---|
| ACR Login Server | `acrethicsnet.azurecr.io` |
| API hostname | `app-ethics-net-api.azurewebsites.net` |
| Web hostname | `app-ethics-net-web.azurewebsites.net` |
| Postgres FQDN | `pg-ethics-net.postgres.database.azure.com` |
| Key Vault URI | `https://kv-ethics-net.vault.azure.net/` |
| DB URL secret | `kv-ethics-net/database-url` |

### 🟡 קבצים מקומיים — ממתינים ל-commit + push

3 קבצים שונו בסשן הזה (כולם מוכנים אך לא קומיטו לפי מדיניות "אסור commit ל-main ישירות"):

1. `infra/azure/appservice/main.bicep` — תיקוני linter, נפרס בהצלחה ל-Azure.
2. `.github/workflows/deploy-azure.yml` — תוספת `build-only` mode.
3. `ops/scripts/setup-microsoft-integrations.ps1` — שכתוב לתרחיש היברידי.
4. `docs/ops/jct-tomorrow-resume.md` — המסמך הזה.

הצעה: branch בשם `feat/azure-bicep-cleanup-and-phase3-prep` עם commit אחד שכולל את 4 הקבצים, ואז trigger ידני ל-`Deploy Azure App Service` workflow ב-GitHub עם `deploy_mode=build-only`.

### מה הלאה (מסלולים אפשריים)

🟢 **Phase 5 build-only** — אחרי commit+push: trigger ל-workflow_dispatch עם `deploy_mode=build-only` יבנה את שתי ה-images וידחוף ל-ACR. אימות מלא ל-CI/CD plumbing (OIDC + ACR push + container registry working) בלי תלות ב-Phase 3.

🟡 **Phase 3 — חצי שאני יכול לעשות לבד עכשיו**:
1. הפעלת PIM `Application Developer` (דרך Portal — Activation 8h).
2. הרצת `setup-microsoft-integrations.ps1` עם `-DryRun` כדי לוודא ב-az login שהשמות תקינים — **לא להריץ בפועל עד ש-IT מחזירים את Mail+Calendar credentials**, כי הסקריפט דורש את כולם כפרמטרים חובה.

🟡 **Phase 3 — חצי שמחכה ל-IT**:
- שליחת `jct-it-handoff-phase3.md` ל-IT (Phase 2 הסתיימה, המסמך כשיר לשליחה).
- ממתין שיחזרו עם: tenant ID של `jct.ac.il`, ApplicationId+Secret של `EthicFlow Mail`, ApplicationId+Secret של `EthicFlow Calendar`.

🟡 **Phase 4 (DNS)** — תלוי ב-Phase 3.

---

## איפה עצרנו (20 במאי 2026, ~16:00)

### ✅ הושלם השבוע

- **Phase 0** — Azure CLI, PowerShell, Resource Providers, RG `RG-ethics-net` ב-`eastus2`, parameters.prod.json, .gitignore — הכל מוכן.
- **PIM Activation** — `Application Developer` Eligible הוקצה ע"י IT (ג'רמי ליונס) ב-20/5/2026 בבוקר, הופעל ידנית דרך Portal. **שים לב — תוקף הפעלה מקסימלי = 8 שעות**, צריך להפעיל מחדש בכל סשן.
- **Phase 1.1** — Service Principal `sp-ethics-net-github-prod` נוצר.
  - `AZURE_CLIENT_ID = 4f885e95-9333-4fbf-a937-30eba5032f19`
  - Tenant = `7b410031-6333-4080-9e61-afdbd57b3bd9`
  - Contributor על `RG-ethics-net`
  - הסיסמה האוטומטית **נמחקה** (OIDC-only).
- **Phase 1.2** — Federated Credential `github-ethics-net-prod` נוצר עבור:
  - Subject = `repo:shmuel416-debug/EticFlow-new:environment:production`
  - Issuer = `https://token.actions.githubusercontent.com`

### 🔴 חוסם פתוח — מכסת `B1 VMs` בסבסקריפשן

What-if validation של Bicep נכשל. ה-Subscription "Azure plan" (CSP) של JCT מגיע עם **quota = 0** ל-App Service workers:

```
SubscriptionIsOverQuotaForSku
Current Limit (Total VMs): 0
Amount required for this deployment (Total VMs): 1
Region: East US 2 | SKU: B1
```

ניסיתי לבקש העלאה דרך Portal (Quotas blade) — כפתור "Request adjustment" אפור כי **אין לי הרשאה ברמת ה-Subscription**, רק על ה-RG. הבקשה ל-IT נמצאת ב-`docs/ops/jct-it-handoff-quota.md`. **שלח ל-IT לפני הסשן הבא.**

### ⏳ ממתין

- **Phase 1.3** — הגדרת GitHub Environment `production` ידנית ב-UI (טבלת ה-Secrets בהמשך). אפשר לעשות מתי שזה נוח, לא חוסם.

---

## פעולה ראשונה בסשן הבא — Re-auth & PIM

ה-Conditional Access אוכף sign-in frequency של **24 שעות**, אז ה-token יפוג. PIM פוקע אחרי 8 שעות. הסקריפט מתחיל ככה:

```powershell
cd C:\EticFlow

# 1. Re-login (יפתח דפדפן, MFA)
az login --tenant "7b410031-6333-4080-9e61-afdbd57b3bd9" --only-show-errors `
  --query "[].{name:name, tenantId:tenantId, user:user.name}" -o table
# צריך לראות: Azure plan / 7b410031-... / goldb@acad.jct.ac.il

# 2. הפעל מחדש את PIM Application Developer (אם נצרך — ראה למטה)
#    דרך Portal: https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/ActivationMenuBlade/~/aadmigratedroles
#    בחר Application Developer → Activate → Duration 8h → Reason "EthicFlow continuation"

# 3. אמת ש-PIM פעיל
az rest --method GET --uri "https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.directoryRole" --query "value[].displayName" -o tsv
# צריך לראות: Application Developer
```

**מתי לא צריך להפעיל PIM מחדש?** רק אם הסשן הבא בתוך 8 שעות מהפעלה קודמת. אחרת — חובה.

---

## בדיקה ראשונה — האם ה-quota אושר?

```powershell
# Re-run what-if. אם הוא עובר בלי SubscriptionIsOverQuotaForSku — quota אושר.
az deployment group what-if `
  --resource-group "RG-ethics-net" `
  --template-file "infra/azure/appservice/main.bicep" `
  --parameters "@infra/azure/appservice/parameters.prod.json" `
  --result-format ResourceIdOnly 2>&1 | Select-Object -Last 30
```

✅ אם רואים רשימת `+ Create` של ~15 משאבים בלי שגיאה — **ממשיכים ל-Phase 2**.  
🔴 אם עדיין `SubscriptionIsOverQuotaForSku` — דחוף את IT שוב.

---

## Phase 2 — פריסת תשתית Bicep (15-25 דקות)

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "7a64b307-d38c-495e-b065-73618a1bdecf" `
  -ResourceGroupName "RG-ethics-net" `
  -Location "eastus2" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json" `
  -SkipLogin
```

`-SkipLogin` חוסך az login כפול (כבר מחוברים מהשלב הראשון).

Postgres הוא הכי איטי (~15 דק'). אחרי שמסיים, שמור outputs:

```powershell
az deployment group show `
  --resource-group "RG-ethics-net" `
  --name "main" `
  --query "properties.outputs" -o json
```

---

## Phase 1.3 — GitHub Environment (אפשר להריץ במקביל ל-Phase 2)

ב-https://github.com/shmuel416-debug/EticFlow-new/settings/environments:

1. **New environment** → `production`
2. **Required reviewers**: הוסף `shmuel416-debug`
3. **Deployment branches**: `Selected branches` → רק `main`
4. **Environment secrets** (לא Repository!):

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | `4f885e95-9333-4fbf-a937-30eba5032f19` |
| `AZURE_TENANT_ID` | `7b410031-6333-4080-9e61-afdbd57b3bd9` |
| `AZURE_SUBSCRIPTION_ID` | `7a64b307-d38c-495e-b065-73618a1bdecf` |
| `AZURE_RESOURCE_GROUP` | `RG-ethics-net` |
| `AZURE_ACR_NAME` | `acrethicsnet` |
| `AZURE_API_APP_NAME` | `app-ethics-net-api` |
| `AZURE_WEB_APP_NAME` | `app-ethics-net-web` |
| `AZURE_API_BASE_URL` | `https://app-ethics-net-api.azurewebsites.net` (יעודכן ל-`https://api.ethics.jct.ac.il` אחרי Phase 4) |

---

## Phases 3-9 — מבט קדימה

| Phase | מטרה | משך | תלות |
| --- | --- | --- | --- |
| 3 | Entra Apps (SSO + Mail + Calendar) + Key Vault + App Settings | ~30 דק + המתנה ל-Admin Consent מ-IT | אחרי Phase 2 |
| 4 | דומיינים מותאמים (`ethics.jct.ac.il`) + Managed SSL | ~60 דק (כולל DNS propagation) | אחרי Phase 3 |
| 5 | Build + Push images דרך GitHub Actions | ~10 דק | אחרי Phase 1.3 + 2 |
| 6 | Bootstrap DB + admin user | ~5 דק | אחרי Phase 5 |
| 7 | Smoke SSO + Go/No-Go | ~30 דק | אחרי Phase 6 |
| 8 | 72 שעות ניטור | passive | אחרי Phase 7 |
| 9 | תפעול שוטף | ongoing | — |

המסמך המקיף: `docs/ops/jct-prod-runbook-he.md`.

---

## Phase 3 — החלטות שהתקבלו (24/5)

📄 **המסמך המלא ל-IT עודכן ב-`docs/ops/jct-it-handoff-phase3.md`** עם התרחיש ההיברידי. שלח אחרי ש-Phase 2 רץ.

### ✅ החלטות סופיות

| נושא | החלטה | tenant יעד | מי מטפל |
|---|---|---|---|
| SSO (login משתמשים) | רוב המשתמשים `@acad.jct.ac.il` | `acad.jct.ac.il` | **אני** — `Application Developer` ב-PIM מספיק |
| Mail (השולח) | חייב `ethicscommittee@jct.ac.il` (branding מקצועי) | `jct.ac.il` (CSP) | **IT** — אין לי הרשאות שם |
| Calendar (יומן ועדה) | יומן של `ethicscommittee@jct.ac.il` | `jct.ac.il` (CSP) | **IT** — אותה סיבה |

### מה זה אומר טכנית

- ה-API שלי יחזיק **2 client credentials** במקביל:
  - `MICROSOFT_AUTH_*` עם tenant `7b410031-...` (acad) ל-SSO
  - `MICROSOFT_MAIL_*` + `MICROSOFT_CALENDAR_*` עם tenant של `jct.ac.il` ל-mail+calendar
- IT מספקים את ה-credentials של Mail+Calendar (לפי handoff doc).
- אני יוצר רק את ה-SSO App בעצמי ב-`acad.jct.ac.il`.

### עדכון נדרש לסקריפט (Phase 3, זריז)

הסקריפט הקיים (`ops/scripts/setup-microsoft-integrations.ps1`) מקבל רק `-TenantId` אחד ומניח שכל 3 ה-Apps באותו tenant. צריך:
1. לעדכן אותו כך שיוצר **רק את `EthicFlow SSO`** ב-tenant הנוכחי.
2. להסיר את החלקים שיוצרים `EthicFlow Mail` + `EthicFlow Calendar`.
3. במקום זאת — לקבל credentials של Mail+Calendar כפרמטרים (`-MailClientId`, `-MailClientSecret`, `-MailTenantId`, וכו') ופשוט לכתוב אותם ל-Key Vault.

הסקריפט יעודכן בתחילת Phase 3 (אחרי ש-Phase 2 פרוס).

---

## פקודות שימושיות לדיבאג

```powershell
# הסטטוס שלי בכל הטננטים
az account list --query "[].{name:name, id:id, tenant:tenantId, default:isDefault}" -o table

# הרשאות Azure RBAC שיש לי
$myId = az ad signed-in-user show --query id -o tsv
az role assignment list --assignee $myId --all `
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# התפקידים שלי ב-Entra (PIM Active בלבד)
az rest --method GET --uri "https://graph.microsoft.com/v1.0/me/memberOf/microsoft.graph.directoryRole" `
  --query "value[].displayName" -o tsv

# בדיקה שה-RG עדיין שם
az group show --name "RG-ethics-net" -o table

# בדיקת SP ו-Federated Credentials שיצרנו
az ad sp list --display-name "sp-ethics-net-github-prod" --query "[].{name:displayName, appId:appId}" -o table
az ad app federated-credential list --id "4f885e95-9333-4fbf-a937-30eba5032f19" `
  --query "[].{name:name, subject:subject}" -o table
```

---

## מבנה התיקיות (תזכורת)

```
C:\EticFlow\
├── infra/azure/appservice/
│   ├── main.bicep                       ← תבנית Bicep (B1 SKU)
│   ├── parameters.prod.json             ← הקובץ שלי (DB password, גיט-עיוור)
│   ├── parameters.example.json          ← template ב-git
│   └── README.md
├── ops/scripts/
│   ├── deploy-azure-baseline.ps1        ← הפריסה הראשית (Phase 2)
│   ├── generate-prod-secrets.ps1        ← יצירת סודות (כבר רץ)
│   ├── setup-microsoft-integrations.ps1 ← Entra Apps (Phase 3)
│   ├── configure-appservice-domains.ps1 ← דומיינים (Phase 4)
│   └── set-azure-api-keyvault-settings.ps1
├── .github/workflows/
│   └── deploy-azure.yml                 ← CI/CD (direct mode)
└── docs/ops/
    ├── jct-prod-runbook-he.md           ← המדריך המקיף (עם סטטוס דינמי)
    ├── jct-it-handoff.md                ← בקשה ראשונה ל-IT (Application Developer — אושרה ✅)
    ├── jct-it-handoff-quota.md          ← בקשה שנייה ל-IT (B1 VMs quota — נשלח 24/5, ממתין 🟡)
    ├── jct-it-handoff-phase3.md         ← בקשה שלישית ל-IT (Phase 3+4: Apps, DNS, consent — מוכן, ממתין ל-Phase 2)
    └── jct-tomorrow-resume.md           ← הקובץ הזה
```

---

## TL;DR — Top משימות לסשן הבא

1. ✅ ~~שלח ל-IT את `jct-it-handoff-quota.md`~~ — **בוצע 24/5**.
2. ✅ ~~Phase 1.3 — GitHub Environment~~ — **בוצע 24/5**.
3. ✅ ~~אישור IT לquota~~ — **התקבל 24/5 בערב**.
4. ✅ ~~Phase 2 — Bicep deploy~~ — **הושלם 24/5 ~21:35** (13 דק').
5. ✅ ~~Bicep linter cleanup + TLS enforcement~~ — **הושלם 24/5 ~22:00** (re-deploy 3.5 דק').
6. ✅ ~~Phase 5 prep (build-only mode)~~ — **הושלם 24/5**, ממתין ל-commit+push.
7. ✅ ~~Phase 3 prep (סקריפט היברידי)~~ — **הושלם 24/5**, ממתין לcredentials מ-IT.
8. 🚀 **הבא**: לאשר commit+push לbranch `feat/azure-bicep-cleanup-and-phase3-prep` → trigger workflow_dispatch עם `deploy_mode=build-only` → לשלוח `jct-it-handoff-phase3.md` ל-IT.

— תיעוד עודכן ע"י סוכן הפיתוח, 24 במאי 2026 (~22:00).
