# Ethic-Net @ JCT — Runbook פריסה לפרודקשן

> מסמך עבודה ייעודי ל-Jerusalem College of Technology. אם אתה ממכון אחר — ראה `docs/ops/azure-appservice-checklist-he.md` (מודל סלוטים) או `docs/ops/azure-two-environments-setup-he.md` (מודל 2 סביבות).

## סטטוס דינמי

| Phase | סטטוס | פריט פתוח |
| --- | --- | --- |
| 0.1 — Azure CLI + login | ✅ | — |
| 0.2 — Resource Providers (8/8 Registered) | ✅ | — |
| 0.3 — סודות + DB password | ✅ | DB password מעודכן ב-`parameters.prod.json`, כל הסודות שמורים אצל המשתמש |
| 0.4 — GitHub repo: `shmuel416-debug/EticFlow-new` | ✅ | — |
| 1.1 — Service Principal | 🔴 חסום | למשתמש אין `Application Developer` ב-Entra. **נשלחה בקשה ל-IT.** |
| 1.2 — Federated Credential | ⏳ | תלוי 1.1 |
| 1.3 — GitHub Environment | ⏳ | תלוי 1.1 |
| 2 — פריסת Bicep | ⏳ | ממתין: DB password ב-`parameters.prod.json` |
| 3 — Microsoft Entra Apps | ⏳ | יבקש Admin Consent מ-IT בנפרד |
| 4+ — Domains, Build... | ⏳ | — |

## החלטות תשתית סופיות

| נושא | בחירה | הערה |
| --- | --- | --- |
| Cloud | Microsoft Azure | Subscription "Azure plan" (`7a64b307-d38c-495e-b065-73618a1bdecf`) |
| Tenant | `acad.jct.ac.il` (`7b410031-6333-4080-9e61-afdbd57b3bd9`) | tenant אקדמי של JCT, **נפרד** מ-JCT proper |
| Region | `eastus2` | latency ~180ms מישראל, נבחר כי RG כבר קיים שם |
| Resource Group | `RG-ethics-net` (קיים, Owner: goldb@acad.jct.ac.il) | יחיד |
| App Service Plan | **B1 Basic** | ללא slots, downtime ~10s בפריסה |
| Postgres | **Standard_B1ms Burstable**, 32GB | חיסכון מקסימלי |
| עלות חודשית משוערת | **~$38/חודש** | ASP + DB + KV + Storage + AppInsights |
| SCM היום | GitHub | repo קיים אצל המפתח |
| CI/CD היום | GitHub Actions (`deploy-azure.yml`) | OIDC, ללא סודות בקוד |
| **SCM/CI עתידי (Phase 10)** | Azure DevOps Repos + Pipelines | מעבר אחרי יציבות בפרוד |
| Frontend domain | `ethics-net.jct.ac.il` | תעודה מנוהלת ע"י Azure |
| API domain | `api.ethics-net.jct.ac.il` | תעודה מנוהלת ע"י Azure |
| SSO | Microsoft Entra | לבירור איפה (acad או jct proper) |
| Email | Microsoft Graph (`Mail.Send`) | מתיבת `ethicscommittee@jct.ac.il` |
| Calendar | Microsoft Graph (`Calendars.ReadWrite`) | יומן `ethicscommittee@jct.ac.il` |

> **שאלה פתוחה (לטיפול ב-Phase 3):** ה-mailbox `ethicscommittee@jct.ac.il` והמשתמשים של ועדת האתיקה נמצאים בטננט `jct.ac.il` (`2505863a-...`) או בטננט האקדמי `acad.jct.ac.il` (`7b410031-...`)? אם הראשון — ה-App Registrations של Microsoft חייבים להיווצר ב-`2505863a-...` (דרך Admin של JCT proper), בעוד ש-Azure resources יושבים ב-`7b410031-...`. **זה אופן עבודה נתמך אך מורכב יותר.**

## ארכיטקטורה פרוסה

```text
Azure plan subscription / acad.jct.ac.il tenant
└── RG-ethics-net (eastus2)
    ├── asp-ethics-net          App Service Plan (B1 Linux)
    ├── app-ethics-net-api      Backend (Node 22 + Express, container)
    ├── app-ethics-net-web      Frontend (React build, container)
    ├── acrethicsnet            Azure Container Registry (Standard)
    ├── pg-ethics-net           Postgres Flexible (B1ms, private VNet)
    ├── kv-ethics-net           Key Vault (RBAC, סיסמאות + JWT)
    ├── stethicsnet01           Storage Account
    │   ├── files/uploads      ← מסמכים שמועלים ע"י חוקרים
    │   └── files/generated    ← מכתבי אישור PDF
    ├── vnet-ethics-net         VNet (10.30.0.0/16) + Private DNS
    ├── appi-ethics-net         Application Insights
    └── law-ethics-net          Log Analytics Workspace

Microsoft Entra (לבירור — acad.jct.ac.il או jct.ac.il)
├── Ethic-Net SSO             Delegated (openid, profile, email, User.Read)
├── Ethic-Net Mail            Application (Mail.Send)
└── Ethic-Net Calendar        Application (Calendars.ReadWrite)
```

---

## שלב 0 — הכנות חשבון וסודות

### מה שכבר נעשה (ע"י סוכן הפיתוח)

- ✅ הוספת `parameters.prod.json` ל-`.gitignore` (אבטחה).
- ✅ הוספת פרמטרי SKU ל-`infra/azure/appservice/main.bicep`.
- ✅ יצירת `infra/azure/appservice/parameters.prod.json` עם ערכי JCT (B1 + B1ms).
- ✅ עדכון `.github/workflows/deploy-azure.yml` לתמוך ב-deploy mode = direct.

### מה שאתה עושה

```powershell
cd C:\EticFlow

az --version
az login
az account show --query "{name:name, subscriptionId:id, tenantId:tenantId, user:user.name}" -o table
```

→ שלח למפתח את `subscriptionId` ואת `tenantId`.

רישום Resource Providers:

```powershell
$providers = @(
  "Microsoft.Web", "Microsoft.ContainerRegistry", "Microsoft.DBforPostgreSQL",
  "Microsoft.KeyVault", "Microsoft.Storage", "Microsoft.Network",
  "Microsoft.Insights", "Microsoft.OperationalInsights"
)
foreach ($p in $providers) { az provider register --namespace $p }
```

יצירת סודות (ללא Key Vault — עוד לא קיים):

```powershell
pwsh ./ops/scripts/generate-prod-secrets.ps1 -FrontendUrl "https://ethics-net.jct.ac.il"
```

מתוך הפלט: שמור את `DB_PASSWORD` ב-KeePass/1Password. החלף את ה-placeholder ב-`infra/azure/appservice/parameters.prod.json` בערך האמיתי. שמור גם את `JWT_SECRET_CURRENT` ו-`CALENDAR_TOKEN_ENCRYPTION_KEY` — נכניס אותם ל-Key Vault ב-Phase 3.

---

## שלב 1 — Service Principal ל-GitHub Actions (OIDC)

### 1.1 יצירת SP עם הרשאת Contributor ל-RG

> **הערה:** RG-ethics-net **כבר קיים** (נוצר ע"י המשתמש מראש). אין צורך ב-`az group create`.

```powershell
$SUBSCRIPTION_ID = "7a64b307-d38c-495e-b065-73618a1bdecf"
$TENANT_ID       = "7b410031-6333-4080-9e61-afdbd57b3bd9"

az ad sp create-for-rbac `
  --name "sp-ethics-net-github-prod" `
  --role "Contributor" `
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/RG-ethics-net"
```

מהפלט שמור: `appId` (זה ה-`AZURE_CLIENT_ID`).

### 1.2 הוספת Federated Credential ל-GitHub OIDC

```powershell
$APP_ID = "<APP_ID_FROM_STEP_1.1>"
$REPO   = "shmuel416-debug/EticFlow-new"

$body = @{
  name      = "github-ethics-net-prod"
  issuer    = "https://token.actions.githubusercontent.com"
  subject   = "repo:${REPO}:environment:production"
  audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Compress

$body | Out-File -FilePath fedcred.json -Encoding utf8
az ad app federated-credential create --id $APP_ID --parameters fedcred.json
Remove-Item fedcred.json
```

### 1.3 הרשאות נוספות שיוצרו אחרי שהתשתית קיימת

ההרשאות הבאות יינתנו אחרי Phase 2 (כשהמשאבים קיימים):

- `AcrPush` על ה-ACR — נחוץ ל-build & push images.
- `Key Vault Secrets User` על ה-KV — אם רוצים שה-pipeline יקרא secrets.
- `Website Contributor` על App Services — כלול ב-Contributor של ה-RG.

נריץ אותן ב-Phase 3.5 (אחרי שה-ACR וה-KV קיימים).

### 1.4 יצירת GitHub Environment `production`

ב-GitHub: `Settings → Environments → New environment → production`.

הגדר:

- **Required reviewers**: לפחות אדם אחד (אתה). ימנע פריסה אוטומטית בטעות.
- **Deployment branch policy**: Selected branches → רק `main`.
- **Wait timer**: 0 (אפשר להוסיף 5 דקות אם רוצים window לביטול).

### 1.5 הוספת Secrets ל-environment

ב-`production` environment הוסף:

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | `appId` של ה-SP (Phase 1.1) |
| `AZURE_TENANT_ID` | ה-Tenant ID של JCT |
| `AZURE_SUBSCRIPTION_ID` | ה-Subscription ID |
| `AZURE_RESOURCE_GROUP` | `RG-ethics-net` |
| `AZURE_ACR_NAME` | `acrethicsnet` |
| `AZURE_API_APP_NAME` | `app-ethics-net-api` |
| `AZURE_WEB_APP_NAME` | `app-ethics-net-web` |
| `AZURE_API_BASE_URL` | `https://api.ethics-net.jct.ac.il` (אחרי Phase 4) |

> בינתיים שים את ה-`AZURE_API_BASE_URL` ל-`https://app-ethics-net-api.azurewebsites.net` עד שיהיה דומיין מותאם. נחליף אחרי Phase 4.

---

## שלב 2 — פריסת תשתית Azure

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "<SUBSCRIPTION_ID>" `
  -ResourceGroupName "RG-ethics-net" `
  -Location "eastus2" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json"
```

צפי זמן: **15-25 דקות** (Postgres הכי איטי).

אחרי שמסיים, שמור outputs:

```powershell
az deployment group show `
  --resource-group "RG-ethics-net" `
  --name "main" `
  --query "properties.outputs" -o json
```

תקבל:
- `apiDefaultHostname` (`app-ethics-net-api.azurewebsites.net`)
- `webDefaultHostname` (`app-ethics-net-web.azurewebsites.net`)
- `acrLoginServer` (`acrethicsnet.azurecr.io`)
- `keyVaultUri` (`https://kv-ethics-net.vault.azure.net/`)
- `postgresFqdn`

---

## שלב 3 — Microsoft Entra Apps + Key Vault

### 3.1 יצירת Entra App Registrations

```powershell
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 `
  -TenantId "<TENANT_ID>" `
  -BaseUrl "https://api.ethics-net.jct.ac.il" `
  -OrganizerEmail "ethicscommittee@jct.ac.il" `
  -FrontendLogoutUrl "https://ethics-net.jct.ac.il/login" `
  -KeyVaultName "kv-ethics-net" `
  -SecretPrefix "ethics-net"
```

הסקריפט יוצר 3 Apps:
- `Ethic-Net SSO` — Delegated (openid, profile, email, User.Read)
- `Ethic-Net Mail` — Application (Mail.Send)
- `Ethic-Net Calendar` — Application (Calendars.ReadWrite)

**אישור Admin Consent (חובה):** היכנס לפורטל Entra → App Registrations → לכל אפליקציה → API Permissions → "Grant admin consent for JCT".

### 3.2 הכנסת סודות נוספים ל-Key Vault

עכשיו ה-KV קיים, אפשר לדחוף את הסודות מ-Phase 0:

```powershell
pwsh ./ops/scripts/generate-prod-secrets.ps1 `
  -FrontendUrl "https://ethics-net.jct.ac.il" `
  -KeyVaultName "kv-ethics-net"
```

> זה יוצר סיסמת DB **חדשה** — אם זה לא הסיסמה ב-`parameters.prod.json`, צריך לעדכן ידנית את ה-Postgres או להחזיר את הסיסמה הישנה:
> ```powershell
> az keyvault secret set --vault-name "kv-ethics-net" --name "db-password" --value "<DB_PASSWORD_FROM_PARAMETERS>"
> ```

### 3.3 חיבור App Settings ל-Key Vault references

```powershell
pwsh ./ops/scripts/set-azure-api-keyvault-settings.ps1 `
  -ResourceGroupName "RG-ethics-net" `
  -ApiAppName "app-ethics-net-api" `
  -KeyVaultName "kv-ethics-net" `
  -FrontendUrl "https://ethics-net.jct.ac.il" `
  -ApiBaseUrl "https://api.ethics-net.jct.ac.il" `
  -OrganizerEmail "ethicscommittee@jct.ac.il" `
  -SecretPrefix "ethics-net"
```

### 3.5 הרשאות נוספות ל-Service Principal

עכשיו שה-ACR וה-KV קיימים:

```powershell
$SP_ID = az ad sp list --display-name "sp-ethics-net-github-prod" --query "[0].id" -o tsv

az role assignment create `
  --assignee $SP_ID `
  --role "AcrPush" `
  --scope $(az acr show --name "acrethicsnet" --query id -o tsv)

az role assignment create `
  --assignee $SP_ID `
  --role "Key Vault Secrets User" `
  --scope $(az keyvault show --name "kv-ethics-net" --query id -o tsv)
```

---

## שלב 4 — דומיינים ו-SSL

### 4.1 הוצאת ערכי אימות DNS

```powershell
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "RG-ethics-net" `
  -WebAppName "app-ethics-net-web" `
  -ApiAppName "app-ethics-net-api" `
  -WebHostname "ethics-net.jct.ac.il" `
  -ApiHostname "api.ethics-net.jct.ac.il"
```

הסקריפט ידפיס ערכי `asuid` ו-CNAME. הוסף ב-DNS של JCT:

| רשומה | סוג | יעד |
| --- | --- | --- |
| `ethics` | CNAME | `app-ethics-net-web.azurewebsites.net` |
| `asuid.ethics` | TXT | `<ASUID_FROM_SCRIPT>` |
| `api.ethics` | CNAME | `app-ethics-net-api.azurewebsites.net` |
| `asuid.api.ethics` | TXT | `<ASUID_FROM_SCRIPT>` |

המתן ~5-30 דקות ל-propagation. אמת:

```powershell
nslookup ethics-net.jct.ac.il
nslookup asuid.ethics-net.jct.ac.il
```

### 4.2 הוספת Custom Domain + Managed Certificate

```powershell
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "RG-ethics-net" `
  -WebAppName "app-ethics-net-web" `
  -ApiAppName "app-ethics-net-api" `
  -WebHostname "ethics-net.jct.ac.il" `
  -ApiHostname "api.ethics-net.jct.ac.il" `
  -ApplyBindings
```

אחרי שהבינדינג עבר — עדכן ב-GitHub Environment את `AZURE_API_BASE_URL` ל-`https://api.ethics-net.jct.ac.il`.

---

## שלב 5 — פריסה ראשונה דרך GitHub Actions

ב-GitHub → Actions → "Deploy Azure App Service" → Run workflow:

| שדה | ערך |
| --- | --- |
| `environment` | `production` |
| `image_tag` | (השאר ריק — יילקח SHA) |
| `deploy_mode` | `direct` |
| `auto_swap` | `false` (לא רלוונטי ב-direct, השאר false) |

לפני הריצה, וודא Required Reviewer רואה את ה-PR ומאשר.

הריצה תעשה:
1. Build + push images ל-`acrethicsnet`.
2. עדכון container image ב-`app-ethics-net-api` ו-`app-ethics-net-web` (downtime ~10s לכל אחד).
3. Health check על `/api/health`.
4. Smoke SSO.

---

## שלב 6 — Bootstrap DB (חד-פעמי)

ה-Postgres הוא private. ל-bootstrap עם משתמש Admin ראשון:

**אפשרות A — דרך SSH אל ה-API container:**

```powershell
az webapp ssh `
  --resource-group "RG-ethics-net" `
  --name "app-ethics-net-api"
```

בתוך ה-shell:

```bash
ADMIN_EMAIL=admin@jct.ac.il \
ADMIN_PASSWORD="<INITIAL_ADMIN_PASSWORD>" \
npm run bootstrap:prod
```

המיגרציות ירוצו אוטומטית בעלייה הראשונה של ה-API container (אם זה לא הוגדר כך — הרץ `npx prisma migrate deploy` ידנית).

> **אסור להריץ `prisma db seed` בפרוד** — זה מכניס משתמשי בדיקה!

---

## שלב 7 — Smoke + Go/No-Go

### בדיקות אוטומטיות

```powershell
$env:SMOKE_BASE_URL = "https://api.ethics-net.jct.ac.il"
$env:SMOKE_ASSERT = "1"
cd backend
npm run smoke:sso
```

### בדיקות ידניות

- [ ] `https://ethics-net.jct.ac.il` נטען עם תעודת SSL תקפה.
- [ ] התחברות עם משתמש Microsoft של JCT עובדת.
- [ ] משתמש מ-tenant אחר נחסם.
- [ ] שליחת פגישת בדיקה יוצרת event ב-Outlook של `ethicscommittee@jct.ac.il`.
- [ ] שליחת מייל בדיקה מגיעה מ-`ethicscommittee@jct.ac.il`.
- [ ] `https://api.ethics-net.jct.ac.il/api/health` מחזיר 200 בתוך 5 דקות רצופות.

### תרגיל Rollback

```powershell
pwsh ./ops/scripts/run-azure-slot-rollback-drill.ps1 `
  -ResourceGroupName "RG-ethics-net" `
  -ApiAppName "app-ethics-net-api" `
  -WebAppName "app-ethics-net-web" `
  -ApiHealthUrl "https://api.ethics-net.jct.ac.il/api/health"
```

> הסקריפט בנוי לסלוטים. ב-B1 ללא slots, ה-rollback הוא דרך תיוג חזרה ל-image ישן:
> ```powershell
> az acr repository show-tags --name "acrethicsnet" --repository "ethic-net-api" --orderby time_desc --top 5
> az webapp config container set --resource-group "RG-ethics-net" --name "app-ethics-net-api" --container-image-name "acrethicsnet.azurecr.io/ethic-net-api:<PREVIOUS_GOOD_TAG>"
> az webapp restart --resource-group "RG-ethics-net" --name "app-ethics-net-api"
> ```

---

## שלב 8 — Cutover ו-72 שעות ניטור

- [ ] תיוג release: `git tag v1.0.0 && git push --tags`.
- [ ] שליחת הודעת go-live למשתמשים בוועדה.
- [ ] הפעלת Alerts ב-App Insights:
  - `/api/health` failed 3x → email
  - 5xx rate > 1% over 5min → email
- [ ] 72 שעות מעקב צמוד: בדיקת לוגים פעמיים ביום.

---

## שלב 9 — תפעול שוטף

| תדירות | משימה | איפה |
| --- | --- | --- |
| כל push ל-`main` | פריסה דרך workflow ידני (Required reviewer) | GitHub Actions |
| יומי | `/api/health` + lookup ב-App Insights | פורטל Azure |
| שבועי | בדיקת backup ב-Postgres | `az postgres flexible-server backup list` |
| חודשי | תרגיל rollback בפרוד אחרי-שעות | סקריפט rollback |
| רבעוני | סיבוב `JWT_SECRET_CURRENT` ב-Key Vault | `generate-prod-secrets.ps1` |

---

## שלב 10 — מעבר ל-Azure DevOps (אחרי יציבות בפרוד)

> זמן ביצוע: 2-3 ימי עבודה. **לא קריטי לעלייה לאוויר** — אפשר לדחות לחודש-חודשיים אחרי go-live.

### 10.1 יצירת ארגון Azure DevOps

1. https://dev.azure.com → Create new organization.
2. שם מוצע: `jct-ethics-net` (URL: `https://dev.azure.com/jct-ethics-net`).
3. צור פרויקט: `Ethic-Net` (Private, Git).

### 10.2 מעבר ה-Repo

```powershell
# Mirror clone מ-GitHub
git clone --mirror https://github.com/<owner>/EticFlow.git

cd EticFlow.git
git remote set-url --push origin https://dev.azure.com/jct-ethics-net/Ethic-Net/_git/Ethic-Net
git push --mirror
```

עכשיו clone חדש מ-Azure DevOps לפיתוח השוטף.

### 10.3 המרת Workflow ל-Azure Pipeline

צור `azure-pipelines.yml` (תרגום של `.github/workflows/deploy-azure.yml`):
- `azure/login@v2` → `AzureCLI@2` task
- `azure/webapps-deploy@v3` → `AzureWebAppContainer@1` task
- `secrets.AZURE_*` → Variable Group מקושר ל-Key Vault

### 10.4 Service Connection עם Workload Identity Federation

ב-Azure DevOps → Project Settings → Service Connections → New → Azure Resource Manager → Workload Identity Federation (Automatic).

זה יוצר Federated Credential **חדש** ב-SP הקיים, עם `subject` של Azure DevOps. ה-SP הישן נשאר זהה — רק הוספנו לו credential נוסף.

### 10.5 Variable Groups + Key Vault link

צור 2 Variable Groups:
- `ethics-net-prod-secrets` — מקושר ל-`kv-ethics-net`, סודות נשלפים בזמן ריצה.
- `ethics-net-prod-config` — ערכי plain (RG, app names, וכו').

### 10.6 Environments + Approvals

ב-Azure DevOps → Pipelines → Environments → צור `production`. הוסף Approval Check עם reviewer.

### 10.7 Cutover

1. Disable את GitHub Actions workflow (לא למחוק — לשמור כגיבוי).
2. הרץ את Pipeline הראשון ב-Azure DevOps.
3. אמת שהפריסה עבדה.
4. אופציונלי: ארכב את ה-repo ב-GitHub (לא למחוק — היסטוריה).

---

## Troubleshooting

### "ACR/Storage/Postgres name already taken"

הוסף סיומת מספרית ב-`parameters.prod.json`:
- `acrethicsnet` → `acrethicsnet01`
- `stethicsnet01` → `stethicsnet02`
- `pg-ethics-net` → `pg-ethics-net-01`
- `kv-ethics-net` → `kv-ethics-net-01`

### "AADSTS70021" ב-OIDC

ה-`subject` של ה-Federated Credential לא תואם. ודא:
- `subject = repo:<owner>/<repo>:environment:production` (case-sensitive)
- ב-workflow יש `permissions: id-token: write`
- ה-job משתמש ב-`environment: production`

### "App Service shows Application Error"

```powershell
az webapp log tail --resource-group "RG-ethics-net" --name "app-ethics-net-api"
```

סיבות נפוצות:
- `DATABASE_URL` לא נטען (בדוק App Settings + Managed Identity permissions ל-KV).
- מיגרציות נכשלו (חפש `Prisma migrate` ב-logs).
- `WEBSITES_PORT=3000` חסר.

### "Key Vault Reference Failed"

```powershell
az webapp identity show --resource-group "RG-ethics-net" --name "app-ethics-net-api"
```

לקח את ה-`principalId` ובדוק:

```powershell
az role assignment list --assignee "<PRINCIPAL_ID>" --scope $(az keyvault show --name "kv-ethics-net" --query id -o tsv)
```

צריך `Key Vault Secrets User`. אם אין:

```powershell
az role assignment create --assignee "<PRINCIPAL_ID>" --role "Key Vault Secrets User" --scope $(az keyvault show --name "kv-ethics-net" --query id -o tsv)
```

---

## Cheat Sheet

```text
Subscription: 7a64b307-d38c-495e-b065-73618a1bdecf  (Azure plan)
Tenant:       7b410031-6333-4080-9e61-afdbd57b3bd9  (acad.jct.ac.il)
Owner user:   goldb@acad.jct.ac.il

RG:           RG-ethics-net                    (eastus2, existing)
ASP:          asp-ethics-net                   (B1 Basic Linux)
API:          app-ethics-net-api               → api.ethics-net.jct.ac.il
Web:          app-ethics-net-web               → ethics-net.jct.ac.il
ACR:          acrethicsnet.azurecr.io
Postgres:     pg-ethics-net (B1ms, 32GB, private)
DB name:      ethic-net
DB user:      ethicsnetadmin
KV:           kv-ethics-net
Storage:      stethicsnet01 (files/uploads, files/generated)
AppInsights:  appi-ethics-net
LogAnalytics: law-ethics-net
VNet:         vnet-ethics-net (10.30.0.0/16)
SP (GitHub):  sp-ethics-net-github-prod
GitHub Env:   production
Organizer:    ethicscommittee@jct.ac.il
```

---

## מסמכים קשורים

- `infra/azure/appservice/main.bicep` — תבנית התשתית.
- `infra/azure/appservice/parameters.prod.json` — פרמטרי JCT (לא ב-Git).
- `.github/workflows/deploy-azure.yml` — pipeline פריסה (direct mode).
- `ops/scripts/deploy-azure-baseline.ps1` — פריסת תשתית.
- `ops/scripts/setup-microsoft-integrations.ps1` — Entra Apps.
- `ops/scripts/configure-appservice-domains.ps1` — דומיינים ו-TLS.
- `ops/scripts/set-azure-api-keyvault-settings.ps1` — App Settings ↔ KV.
- `ops/scripts/generate-prod-secrets.ps1` — סודות אקראיים.
- `docs/ops/go-live-execution-checklist.md` — צ'קליסט Go-Live באנגלית.
- `docs/ops/post-launch-operations-checklist.md` — תפעול אחרי השקה.
