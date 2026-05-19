# EthicFlow — מדריך פריסה מלא לשתי סביבות נפרדות ב-Azure (Dev + Production)

מסמך זה מתאר שלב‑אחר‑שלב איך להקים, לפרוס ולתחזק את EthicFlow ב-Azure בשתי סביבות **נפרדות לחלוטין**:

- **Dev** — סביבת פיתוח/בדיקות בענן (`rg-ethicflow-dev`).
- **Production** — סביבת ייצור חיה (`rg-ethicflow-prod`).

> זהו המסמך המומלץ אם רוצים בידוד מלא בין סביבות. אם מעדיפים מודל סלוטים (production + staging באותו RG) — ראה `docs/ops/azure-appservice-checklist-he.md` ו-`docs/ops/azure-weekly-release-runbook-he.md`.

---

## תוכן עניינים

1. [סקירת הארכיטקטורה](#1-סקירת-הארכיטקטורה)
2. [קונבנציית שמות](#2-קונבנציית-שמות)
3. [דרישות מוקדמות](#3-דרישות-מוקדמות)
4. [שלב 0 — הכנת חשבון Azure ומשתמשים](#שלב-0--הכנת-חשבון-azure-ומשתמשים)
5. [שלב 1 — קבצי פרמטרים לכל סביבה](#שלב-1--קבצי-פרמטרים-לכל-סביבה)
6. [שלב 2 — פריסת תשתית Dev](#שלב-2--פריסת-תשתית-dev)
7. [שלב 3 — פריסת תשתית Production](#שלב-3--פריסת-תשתית-production)
8. [שלב 4 — Microsoft Entra (App Registrations) לכל סביבה](#שלב-4--microsoft-entra-app-registrations-לכל-סביבה)
9. [שלב 5 — Key Vault: סודות והגדרות לכל סביבה](#שלב-5--key-vault-סודות-והגדרות-לכל-סביבה)
10. [שלב 6 — דומיינים ותעודות SSL](#שלב-6--דומיינים-ותעודות-ssl)
11. [שלב 7 — GitHub Actions: שני Environments + OIDC](#שלב-7--github-actions-שני-environments--oidc)
12. [שלב 8 — בנייה ופריסת ה-Containers (ראשונית)](#שלב-8--בנייה-ופריסת-ה-containers-ראשונית)
13. [שלב 9 — מיגרציות DB וזריעת נתונים](#שלב-9--מיגרציות-db-וזריעת-נתונים)
14. [שלב 10 — Smoke + Go/No-Go](#שלב-10--smoke--gono-go)
15. [שלב 11 — Promote: מ-Dev ל-Production](#שלב-11--promote-מ-dev-ל-production)
16. [שלב 12 — Rollback לכל סביבה](#שלב-12--rollback-לכל-סביבה)
17. [נוהל עבודה שוטף (יומי/שבועי)](#נוהל-עבודה-שוטף-יומישבועי)
18. [אופטימיזציית עלויות לסביבת Dev](#אופטימיזציית-עלויות-לסביבת-dev)
19. [טבלת משאבים — Cheat Sheet](#טבלת-משאבים--cheat-sheet)
20. [Troubleshooting](#troubleshooting)

---

## 1) סקירת הארכיטקטורה

כל סביבה היא **עותק שלם ועצמאי** של אותם משאבים, באותו אזור (`westeurope` כברירת מחדל), אך ב-Resource Group נפרד:

```text
Subscription
├── rg-ethicflow-dev   ← סביבת פיתוח (לא חיה)
│   ├── App Service Plan (asp-ethicflow-dev)
│   ├── Backend  (app-ethicflow-api-dev)
│   ├── Frontend (app-ethicflow-web-dev)
│   ├── ACR (acrethicflowdev)
│   ├── PostgreSQL Flexible Server (pg-ethicflow-dev)
│   ├── Key Vault (kv-ethicflow-dev)
│   ├── Storage Account + File Shares (stethicflowdev01)
│   ├── Log Analytics + App Insights
│   ├── VNet (vnet-ethicflow-dev)
│   └── Microsoft Entra Apps עם redirect URIs של Dev
│
└── rg-ethicflow-prod  ← סביבת ייצור חיה
    ├── App Service Plan (asp-ethicflow-prod)
    ├── Backend  (app-ethicflow-api-prod)
    ├── Frontend (app-ethicflow-web-prod)
    ├── ACR (acrethicflowprod)
    ├── PostgreSQL Flexible Server (pg-ethicflow-prod)
    ├── Key Vault (kv-ethicflow-prod)
    ├── Storage Account + File Shares (stethicflowprod01)
    ├── Log Analytics + App Insights
    ├── VNet (vnet-ethicflow-prod)
    └── Microsoft Entra Apps עם redirect URIs של Prod
```

עקרונות מפתח:

- **אין שיתוף משאבים** בין הסביבות (לא DB, לא ACR, לא Key Vault, לא App Insights).
- **DNS שונה**: `dev.ethics.<institution>.ac.il` ו-`api.dev.ethics.<institution>.ac.il` ל-Dev, `ethics.<institution>.ac.il` ו-`api.ethics.<institution>.ac.il` ל-Prod.
- **Microsoft App Registrations נפרדים** עם redirect URIs שונים, כדי שהתחברויות SSO לא יתנגשו.
- **GitHub Environments נפרדים** (`dev`, `production`) עם סודות שונים ואישורי deploy שונים.
- אותו `main.bicep` משרת את שתי הסביבות — רק קובץ ה-parameters משתנה.

---

## 2) קונבנציית שמות

| משאב | Dev | Production |
| --- | --- | --- |
| Resource Group | `rg-ethicflow-dev` | `rg-ethicflow-prod` |
| App Service Plan | `asp-ethicflow-dev` | `asp-ethicflow-prod` |
| Backend App | `app-ethicflow-api-dev` | `app-ethicflow-api-prod` |
| Frontend App | `app-ethicflow-web-dev` | `app-ethicflow-web-prod` |
| ACR | `acrethicflowdev` | `acrethicflowprod` |
| PostgreSQL | `pg-ethicflow-dev` | `pg-ethicflow-prod` |
| Key Vault | `kv-ethicflow-dev` | `kv-ethicflow-prod` |
| Storage | `stethicflowdev01` | `stethicflowprod01` |
| App Insights | `appi-ethicflow-dev` | `appi-ethicflow-prod` |
| Log Analytics | `law-ethicflow-dev` | `law-ethicflow-prod` |
| VNet | `vnet-ethicflow-dev` | `vnet-ethicflow-prod` |
| Frontend domain | `dev.ethics.<institution>.ac.il` | `ethics.<institution>.ac.il` |
| API domain | `api.dev.ethics.<institution>.ac.il` | `api.ethics.<institution>.ac.il` |

> שמות של ACR, Storage Account, Postgres ו-Key Vault חייבים להיות **ייחודיים בכל ה-Azure**. אם השמות תפוסים — הוסף סיומת מספרית (`acrethicflowdev01` וכו').

---

## 3) דרישות מוקדמות

על המחשב שמריץ את הפריסה (Windows/PowerShell):

- **Azure CLI** ≥ 2.55 — בדיקה: `az version`
- **Bicep** ≥ 0.24 — בדיקה: `az bicep version`
- **PowerShell 7+** — בדיקה: `pwsh --version`
- **Docker Desktop** או רכיב build container אחר.
- **Git** + הרשאת push למאגר.
- **Node.js 22 LTS** (להרצת smoke ומיגרציות).

ב-Azure:

- Subscription פעיל אחד (אפשר לפצל ל-2 Subscriptions אם רוצים בידוד billing מלא).
- הרשאת **Owner** על ה-Subscription, או לפחות **Contributor + User Access Administrator** (חובה לצורך role assignments של Managed Identity).
- הרשאת **Application Administrator** ב-Entra ID (כדי ליצור App Registrations).
- שני דומיינים מוכנים אצל ה-DNS שלך (ל-Dev ול-Prod), עם גישה לעדכן רשומות `CNAME` ו-`TXT`.

---

## שלב 0 — הכנת חשבון Azure ומשתמשים

```powershell
# התחברות לחשבון
az login

# בדיקה שאתה על ה-Subscription הנכון
az account show --query "{name:name, id:id, tenantId:tenantId}" -o table

# אם יש כמה — בחר את הרצוי
az account set --subscription "<SUBSCRIPTION_ID>"

# רישום Resource Providers (חד פעמי לכל Subscription)
$providers = @(
  "Microsoft.Web",
  "Microsoft.ContainerRegistry",
  "Microsoft.DBforPostgreSQL",
  "Microsoft.KeyVault",
  "Microsoft.Storage",
  "Microsoft.Network",
  "Microsoft.Insights",
  "Microsoft.OperationalInsights"
)
foreach ($p in $providers) { az provider register --namespace $p }
```

המתן 1-2 דקות וודא שכולם `Registered`:

```powershell
az provider show --namespace Microsoft.Web --query registrationState -o tsv
```

---

## שלב 1 — קבצי פרמטרים לכל סביבה

יש כבר תבנית בסיסית במאגר:

- `infra/azure/appservice/parameters.example.json` — תבנית כללית.
- `infra/azure/appservice/parameters.dev.example.json` — תבנית מוכנה ל-Dev (נוצרה כחלק מהמדריך הזה).

צור עותקים אישיים (אל תיכנס ל-git):

```powershell
cd infra/azure/appservice

# Dev
Copy-Item parameters.dev.example.json parameters.dev.json

# Production
Copy-Item parameters.example.json parameters.prod.json
```

ב-`parameters.dev.json` ו-`parameters.prod.json` עדכן:

1. **`postgresAdminPassword`** — הפק סיסמה חזקה. לדוגמה:
   ```powershell
   pwsh ./ops/scripts/generate-prod-secrets.ps1 -FrontendUrl "https://dev.ethics.example.ac.il"
   ```
   העתק רק את ה-`DB_PASSWORD` ושים בקובץ הפרמטרים. **אל תעלה את הקובץ ל-git**.

2. **`frontendOrigin`** — עדכן לדומיין שאתה מתכנן (Dev/Prod בהתאם).

3. **`organizerEmail`** — תיבת מייל ארגונית פעילה בטננט שלך.

4. בדוק ש-`acrName`, `storageAccountName`, `postgresServerName`, `keyVaultName` ייחודיים ב-Azure. אם תפוסים — הוסף סיומת מספרית.

> וודא ש-`parameters.dev.json` ו-`parameters.prod.json` כלולים ב-`.gitignore` (או לפחות ערכי הסיסמה לא נכנסים).

---

## שלב 2 — פריסת תשתית Dev

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "<SUBSCRIPTION_ID>" `
  -ResourceGroupName "rg-ethicflow-dev" `
  -Location "westeurope" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.dev.json"
```

הסקריפט:

1. מתחבר ל-Azure ובוחר את ה-Subscription.
2. יוצר את `rg-ethicflow-dev` אם לא קיים.
3. מריץ את `main.bicep` עם הפרמטרים.
4. מאמת שכל סוגי המשאבים נוצרו (`Microsoft.Web/sites`, `Microsoft.DBforPostgreSQL/flexibleServers`, `Microsoft.KeyVault/vaults`, וכו').

זמן הרצה משוער: **15-25 דקות** (Postgres ו-VNet הם הכי איטיים).

בסוף, תיעוד ערכי הפלט:

```powershell
az deployment group show `
  --resource-group "rg-ethicflow-dev" `
  --name "main" `
  --query "properties.outputs" -o json
```

שמור: `apiDefaultHostname`, `webDefaultHostname`, `acrLoginServer`, `keyVaultUri`, `postgresFqdn`.

---

## שלב 3 — פריסת תשתית Production

זהה לשלב 2, רק מחליפים פרמטרים:

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "<SUBSCRIPTION_ID>" `
  -ResourceGroupName "rg-ethicflow-prod" `
  -Location "westeurope" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json"
```

> מומלץ להריץ Production רק אחרי שהוכחת ש-Dev עובד מקצה לקצה.

---

## שלב 4 — Microsoft Entra (App Registrations) לכל סביבה

צריך **שלושה App Registrations נפרדים לכל סביבה** (סה"כ 6 אפליקציות):

- `EthicFlow SSO Dev` / `EthicFlow SSO Prod` — התחברות (Delegated)
- `EthicFlow Mail Dev` / `EthicFlow Mail Prod` — שליחת מיילים (Application: `Mail.Send`)
- `EthicFlow Calendar Dev` / `EthicFlow Calendar Prod` — יומן (Application: `Calendars.ReadWrite`)

הפרדה זו חיונית כדי ש:

- redirect URIs של Dev (`https://api.dev.ethics.../api/auth/microsoft/callback`) לא יישלחו ל-Prod.
- אפשר לבטל גישת Dev מבלי לפגוע ב-Prod.

### Dev

```powershell
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 `
  -TenantId "<TENANT_GUID>" `
  -BaseUrl "https://api.dev.ethics.<institution>.ac.il" `
  -OrganizerEmail "ethics-dev@<institution>.ac.il" `
  -FrontendLogoutUrl "https://dev.ethics.<institution>.ac.il/login" `
  -KeyVaultName "kv-ethicflow-dev" `
  -SecretPrefix "ethicflow-dev"
```

### Production

```powershell
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 `
  -TenantId "<TENANT_GUID>" `
  -BaseUrl "https://api.ethics.<institution>.ac.il" `
  -OrganizerEmail "ethics@<institution>.ac.il" `
  -FrontendLogoutUrl "https://ethics.<institution>.ac.il/login" `
  -KeyVaultName "kv-ethicflow-prod" `
  -SecretPrefix "ethicflow-prod"
```

לאחר ההרצה, בפורטל Entra:

- ודא ש-3 ה-Apps של כל סביבה קיימים.
- ודא שניתן **Admin Consent** לכל ההרשאות.
- ודא שכולם מוגדרים `Single tenant (AzureADMyOrg)`.

---

## שלב 5 — Key Vault: סודות והגדרות לכל סביבה

### יצירת סודות פנימיים (JWT, מפתחות הצפנה, סיסמת DB)

#### Dev

```powershell
pwsh ./ops/scripts/generate-prod-secrets.ps1 `
  -FrontendUrl "https://dev.ethics.<institution>.ac.il" `
  -KeyVaultName "kv-ethicflow-dev"
```

#### Production

```powershell
pwsh ./ops/scripts/generate-prod-secrets.ps1 `
  -FrontendUrl "https://ethics.<institution>.ac.il" `
  -KeyVaultName "kv-ethicflow-prod"
```

הסקריפט שם ב-Key Vault: `jwt-secret-current`, `db-password`, `calendar-token-encryption-key`.

> שים לב: הסקריפט מייצר **סיסמת DB חדשה** ושם אותה ב-Key Vault. ה-Bicep יצר את ה-DB עם הסיסמה שב-`parameters.*.json`. אם הסיסמאות לא תואמות, עדכן את הסיסמה של ה-Postgres או החזר את הערך מ-`parameters.*.json` ל-Key Vault.

### חיבור App Settings ל-Key Vault references

#### Dev

```powershell
pwsh ./ops/scripts/set-azure-api-keyvault-settings.ps1 `
  -ResourceGroupName "rg-ethicflow-dev" `
  -ApiAppName "app-ethicflow-api-dev" `
  -KeyVaultName "kv-ethicflow-dev" `
  -FrontendUrl "https://dev.ethics.<institution>.ac.il" `
  -ApiBaseUrl "https://api.dev.ethics.<institution>.ac.il" `
  -OrganizerEmail "ethics-dev@<institution>.ac.il" `
  -SecretPrefix "ethicflow-dev"
```

#### Production

```powershell
pwsh ./ops/scripts/set-azure-api-keyvault-settings.ps1 `
  -ResourceGroupName "rg-ethicflow-prod" `
  -ApiAppName "app-ethicflow-api-prod" `
  -KeyVaultName "kv-ethicflow-prod" `
  -FrontendUrl "https://ethics.<institution>.ac.il" `
  -ApiBaseUrl "https://api.ethics.<institution>.ac.il" `
  -OrganizerEmail "ethics@<institution>.ac.il" `
  -SecretPrefix "ethicflow-prod"
```

---

## שלב 6 — דומיינים ותעודות SSL

### Dev — הדפסת ערכי אימות DNS

```powershell
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "rg-ethicflow-dev" `
  -WebAppName "app-ethicflow-web-dev" `
  -ApiAppName "app-ethicflow-api-dev" `
  -WebHostname "dev.ethics.<institution>.ac.il" `
  -ApiHostname "api.dev.ethics.<institution>.ac.il"
```

הסקריפט מדפיס את ערכי ה-`asuid` ואת רשומות ה-CNAME. הוסף אותן ב-DNS שלך והמתן ל-propagation (5-30 דקות בדרך כלל).

### Dev — הוספת hostname + Managed Certificate

```powershell
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "rg-ethicflow-dev" `
  -WebAppName "app-ethicflow-web-dev" `
  -ApiAppName "app-ethicflow-api-dev" `
  -WebHostname "dev.ethics.<institution>.ac.il" `
  -ApiHostname "api.dev.ethics.<institution>.ac.il" `
  -ApplyBindings
```

### Production — שני שלבים זהים

```powershell
# שלב 1 — אימות
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "rg-ethicflow-prod" `
  -WebAppName "app-ethicflow-web-prod" `
  -ApiAppName "app-ethicflow-api-prod" `
  -WebHostname "ethics.<institution>.ac.il" `
  -ApiHostname "api.ethics.<institution>.ac.il"

# שלב 2 — Bind
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "rg-ethicflow-prod" `
  -WebAppName "app-ethicflow-web-prod" `
  -ApiAppName "app-ethicflow-api-prod" `
  -WebHostname "ethics.<institution>.ac.il" `
  -ApiHostname "api.ethics.<institution>.ac.il" `
  -ApplyBindings
```

---

## שלב 7 — GitHub Actions: שני Environments + OIDC

### 7.1 צור 2 Federated Credentials באותו Service Principal (או 2 SPs נפרדים)

מומלץ לפצל ל-**שני Service Principals** — אחד לכל סביבה — כדי לבודד הרשאות:

```powershell
# Service Principal עבור Dev (Contributor רק על rg-ethicflow-dev)
az ad sp create-for-rbac `
  --name "sp-ethicflow-github-dev" `
  --role "Contributor" `
  --scopes "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-ethicflow-dev"

# Service Principal עבור Prod (Contributor רק על rg-ethicflow-prod)
az ad sp create-for-rbac `
  --name "sp-ethicflow-github-prod" `
  --role "Contributor" `
  --scopes "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-ethicflow-prod"
```

לכל אחד הוסף **Federated Credential** ל-GitHub OIDC (ללא סיסמה אמיתית):

```powershell
# דוגמה ל-Dev
$body = @{
  name = "github-ethicflow-dev"
  issuer = "https://token.actions.githubusercontent.com"
  subject = "repo:<OWNER>/<REPO>:environment:dev"
  audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json

az ad app federated-credential create `
  --id "<APP_ID_OF_SP_DEV>" `
  --parameters $body
```

חזור על אותו דבר ל-Prod עם `subject=repo:<OWNER>/<REPO>:environment:production`.

### 7.2 הוסף הרשאות נוספות לכל SP

ה-SP צריך גם:

- `AcrPush` על ה-ACR שלו.
- `Website Contributor` על ה-App Services שלו (כלול ב-Contributor אם נתת על כל ה-RG).
- `Key Vault Secrets User` על ה-Key Vault שלו (לקריאת סודות במקרה הצורך).

```powershell
# דוגמה ל-Dev
$spDevId = az ad sp list --display-name "sp-ethicflow-github-dev" --query "[0].id" -o tsv

az role assignment create `
  --assignee $spDevId `
  --role "AcrPush" `
  --scope $(az acr show --name "acrethicflowdev" --query id -o tsv)
```

חזור על זה ל-Prod.

### 7.3 צור 2 GitHub Environments

ב-GitHub: `Settings → Environments → New environment`:

- `dev` — ללא Required reviewers (פריסה אוטומטית מ-`develop` או `main`).
- `production` — **חובה** Required reviewers (מינימום 1 אישור), ו-Restrict to branch `main`.

### 7.4 הוסף Secrets לכל Environment

| Secret | Dev value | Prod value |
| --- | --- | --- |
| `AZURE_CLIENT_ID` | App ID של `sp-ethicflow-github-dev` | App ID של `sp-ethicflow-github-prod` |
| `AZURE_TENANT_ID` | זהה | זהה |
| `AZURE_SUBSCRIPTION_ID` | זהה | זהה |
| `AZURE_RESOURCE_GROUP` | `rg-ethicflow-dev` | `rg-ethicflow-prod` |
| `AZURE_ACR_NAME` | `acrethicflowdev` | `acrethicflowprod` |
| `AZURE_API_APP_NAME` | `app-ethicflow-api-dev` | `app-ethicflow-api-prod` |
| `AZURE_WEB_APP_NAME` | `app-ethicflow-web-dev` | `app-ethicflow-web-prod` |
| `AZURE_STAGING_API_BASE_URL` | `https://api.dev.ethics.<institution>.ac.il` | `https://api.ethics.<institution>.ac.il` (או slot URL) |

### 7.5 התאמת ה-Workflow לשתי הסביבות

ה-workflow הקיים `.github/workflows/deploy-azure.yml` כבר מקבל `environment` כ-input. בעת הרצה:

- **לסביבת Dev** — בחר `environment: dev`. אפשר להריץ אוטומטית ב-push ל-`develop` או `main` עם `auto_swap: true` (בדגם הזה אין באמת swap; נסביר מטה).
- **לסביבת Prod** — בחר `environment: production` עם `auto_swap: false`, ואחרי אישור והרצת smoke ידנית — `auto_swap: true`.

> בדגם של שתי סביבות נפרדות (Dev RG + Prod RG) **אין שימוש ב-slots** — כל פריסה היא ישירות ל-App Service של אותה סביבה. כדי להפסיק swap, אפשר להגדיר `auto_swap: true` קבוע ל-Dev (כי אין production slot להחליף איתו) או לפשט את ה-workflow כך שלא ינסה swap ב-Dev.

המלצה: **שכפל את ה-workflow** לשניים נפרדים:

- `.github/workflows/deploy-azure-dev.yml` — ללא slots, פריסה ישירה ל-`app-ethicflow-api-dev` ו-`app-ethicflow-web-dev`.
- `.github/workflows/deploy-azure-prod.yml` — עם slots (production + staging) או ישירות, לפי בחירתך.

> אם רוצים, אפשר להוסיף את הקובץ הזה כמשימה נפרדת. יידע אותי אם תרצה גם את זה.

---

## שלב 8 — בנייה ופריסת ה-Containers (ראשונית)

### Dev — ידנית (פעם ראשונה)

```powershell
$ACR = "acrethicflowdev"
$TAG = "init-$(git rev-parse --short HEAD)"

az acr login --name $ACR

docker build -t "$ACR.azurecr.io/ethicflow-api:$TAG" ./backend
docker build -t "$ACR.azurecr.io/ethicflow-web:$TAG" ./frontend

docker push "$ACR.azurecr.io/ethicflow-api:$TAG"
docker push "$ACR.azurecr.io/ethicflow-web:$TAG"

# עדכן את ה-App Services לטעון את ה-tag החדש
az webapp config container set `
  --resource-group "rg-ethicflow-dev" `
  --name "app-ethicflow-api-dev" `
  --container-image-name "$ACR.azurecr.io/ethicflow-api:$TAG"

az webapp config container set `
  --resource-group "rg-ethicflow-dev" `
  --name "app-ethicflow-web-dev" `
  --container-image-name "$ACR.azurecr.io/ethicflow-web:$TAG"

# הפעל מחדש
az webapp restart --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"
az webapp restart --resource-group "rg-ethicflow-dev" --name "app-ethicflow-web-dev"
```

### Production — אותו דבר עם `acrethicflowprod` ו-`rg-ethicflow-prod`

> אחרי ההרצה הראשונית, כל הפריסות הבאות יילכו דרך ה-GitHub Actions workflow.

---

## שלב 9 — מיגרציות DB וזריעת נתונים

ה-Postgres ב-Dev/Prod הוא private (publicNetworkAccess: Disabled). יש שתי דרכים להריץ מיגרציות:

### אפשרות A (מומלץ) — דרך ה-API container

ה-backend מריץ אוטומטית `npx prisma migrate deploy` ב-startup (תלוי בהגדרה ב-`backend/Dockerfile` או entrypoint). אם כן — הפריסה הראשונה תריץ אוטומטית.

ודא שזה אכן קורה:

```powershell
az webapp log tail --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"
```

חפש שורות כמו `Applying migration...`.

### אפשרות B — Bastion / Jump host

אם המיגרציות לא רצות אוטומטית:

1. צור Azure Bastion חד-פעמי באותו VNet.
2. מהמכונה — הרץ `psql` או `prisma migrate deploy` עם `DATABASE_URL` של אותה סביבה.

### זריעת נתונים בסיסית (Dev בלבד!)

```powershell
# מתוך ה-API container, אחרי שהוא רץ:
az webapp ssh --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"
# ובתוך ה-shell:
node prisma/seed.js
```

> **לעולם אל תריץ seed ב-Production** אלא אם זה seed אדמיניסטרטיבי בלבד שאינו מוסיף נתוני בדיקה.

---

## שלב 10 — Smoke + Go/No-Go

### Dev

```powershell
$env:SMOKE_BASE_URL = "https://api.dev.ethics.<institution>.ac.il"
$env:SMOKE_ASSERT = "1"
cd backend
npm run smoke:sso
```

בדוק ידנית בדפדפן:

- `https://dev.ethics.<institution>.ac.il` → טעינה תקינה.
- התחבר עם משתמש Microsoft מהטננט.
- צור פגישת בדיקה → ודא שנוצרה ב-Outlook של המארגן.
- בדוק `https://api.dev.ethics.<institution>.ac.il/api/health` → `200 OK`.

### Production — אחרי שכל הבדיקות ב-Dev עברו

חזור על אותו smoke מול URL של Prod. **אל תעלה ל-Prod אם משהו לא עבר ב-Dev.**

תנאי Go-Live (חובה):

- [ ] Smoke SSO עובר ב-Dev וב-Prod.
- [ ] משתמש מטננט אחר נחסם (single-tenant enforcement).
- [ ] מייל איפוס סיסמה נשלח מהתיבה הארגונית.
- [ ] יצירת פגישה יוצרת event ב-Outlook.
- [ ] `/api/health` יציב לפחות 5 דקות רצופות.
- [ ] תרגיל rollback בוצע בהצלחה השבוע (ראה שלב 12).

---

## שלב 11 — Promote: מ-Dev ל-Production

הזרימה היומיומית:

1. מפתח דוחף ל-`develop` או פותח PR ל-`main`.
2. CI build → push image ל-`acrethicflowdev` → deploy ל-Dev → smoke אוטומטי.
3. PO/QA מאשר ב-Dev.
4. Merge ל-`main`.
5. Workflow ידני (`workflow_dispatch`) מריץ פריסה ל-`production`:
   - Build חדש מאותו commit (או pull של אותו image מ-Dev ותיוג מחדש ל-Prod ACR).
   - Push ל-`acrethicflowprod`.
   - Deploy ל-`app-ethicflow-api-prod` ו-`app-ethicflow-web-prod`.
   - Smoke אוטומטי.
6. אם הכל ירוק → ה-environment `production` ב-GitHub מבקש Required reviewer לאשר.
7. Merge to main + tag (`v1.x.y`).

> **מלכודת נפוצה**: לעולם אל תעביר image בין Dev ל-Prod ע"י pull/push ידני בלי לבנות מחדש מאותו commit. תמיד build מ-Git ref מאומת.

### דרך מומלצת: Promote-by-tag

ב-Dev images מתויגים `dev-<sha>`. ב-Prod מבצעים `docker pull` של ה-image מ-Dev ACR, מתייגים מחדש כ-`prod-<sha>` ודוחפים ל-Prod ACR. דורש `AcrPull` על Dev ACR ו-`AcrPush` על Prod ACR ל-SP של Prod.

---

## שלב 12 — Rollback לכל סביבה

### Rollback מהיר (Container image)

לכל App Service יש היסטוריית deployments. החזרה:

```powershell
# לפנים — רשימת tags זמינים
az acr repository show-tags `
  --name "acrethicflowprod" `
  --repository "ethicflow-api" `
  --orderby time_desc `
  --top 10

# החלף ל-tag קודם יציב
az webapp config container set `
  --resource-group "rg-ethicflow-prod" `
  --name "app-ethicflow-api-prod" `
  --container-image-name "acrethicflowprod.azurecr.io/ethicflow-api:<PREVIOUS_GOOD_TAG>"

az webapp restart --resource-group "rg-ethicflow-prod" --name "app-ethicflow-api-prod"
```

זמן rollback צפוי: **2-4 דקות**.

### Rollback של DB

ה-Postgres Flexible Server עושה גיבוי יומי לפי `backupRetentionDays: 14`. שחזור:

```powershell
az postgres flexible-server restore `
  --resource-group "rg-ethicflow-prod" `
  --name "pg-ethicflow-prod-restore-$(Get-Date -Format yyyyMMddHHmm)" `
  --source-server "pg-ethicflow-prod" `
  --restore-time "2026-05-10T20:00:00Z"
```

ואז עדכן את ה-`database-url` ב-Key Vault.

> מומלץ: הרץ תרגיל rollback מלא לפחות **פעם בחודש** ב-Dev.

```powershell
pwsh ./ops/scripts/run-azure-slot-rollback-drill.ps1 `
  -ResourceGroupName "rg-ethicflow-dev" `
  -ApiAppName "app-ethicflow-api-dev" `
  -WebAppName "app-ethicflow-web-dev" `
  -ApiHealthUrl "https://api.dev.ethics.<institution>.ac.il/api/health"
```

---

## נוהל עבודה שוטף (יומי/שבועי)

| תדירות | פעולה | סביבה |
| --- | --- | --- |
| כל push ל-`develop`/`main` | Build + Deploy אוטומטי + Smoke | Dev |
| יומי | בדיקת `/api/health` + App Insights alerts | שתיהן |
| שבועי | Promote לאישור ל-Prod (יום ג' לדוגמה) | Dev → Prod |
| שבועי | תרגיל rollback | Dev |
| חודשי | תרגיל restore של DB | Dev |
| חודשי | סקירת Cost Management ב-Azure | שתיהן |
| רבעוני | סיבוב סיסמת Postgres + JWT secret | Prod |

---

## אופטימיזציית עלויות לסביבת Dev

ה-Bicep הנוכחי משתמש ב-`P0v3` עבור App Service Plan וב-`Standard_D2s_v3` עבור Postgres. ב-Prod זה מצוין; ב-Dev אפשר לחסוך משמעותית. שתי גישות:

### גישה A — שני קבצי Bicep (מומלץ לעתיד)

הוסף ל-`main.bicep` פרמטרים `appServicePlanSku`, `postgresSku`, וב-`parameters.dev.json` קבע ערכים זולים יותר (`B1`, `Standard_B1ms`).

### גישה B — Override ידני אחרי הפריסה

```powershell
# הקטנת App Service Plan ל-B1
az appservice plan update `
  --resource-group "rg-ethicflow-dev" `
  --name "asp-ethicflow-dev" `
  --sku B1

# הקטנת Postgres ל-Burstable
az postgres flexible-server update `
  --resource-group "rg-ethicflow-dev" `
  --name "pg-ethicflow-dev" `
  --sku-name Standard_B1ms `
  --tier Burstable
```

ערך משוער חודשי (`westeurope`):

| משאב | Prod (PremiumV3 + GP) | Dev (Basic + Burstable) |
| --- | --- | --- |
| App Service Plan | ~$110 | ~$13 |
| Postgres | ~$120 | ~$15 |
| Storage + ACR + KV + AppInsights | ~$15 | ~$10 |
| **סה"כ** | **~$245** | **~$38** |

> הנתונים משוערים, להתעדכן לפי תמחור Azure בפועל.

טיפ נוסף: **כבה את Dev בלילה**:

```powershell
# Stop בסוף יום העבודה
az webapp stop --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"
az webapp stop --resource-group "rg-ethicflow-dev" --name "app-ethicflow-web-dev"

# Start בבוקר
az webapp start --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"
az webapp start --resource-group "rg-ethicflow-dev" --name "app-ethicflow-web-dev"
```

אפשר לאוטומט עם Azure Automation Runbook מתוזמן.

---

## טבלת משאבים — Cheat Sheet

```text
┌──────────────────────┬─────────────────────────────┬─────────────────────────────┐
│ משאב                 │ Dev                         │ Production                  │
├──────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ Resource Group       │ rg-ethicflow-dev            │ rg-ethicflow-prod           │
│ ASP                  │ asp-ethicflow-dev (B1)      │ asp-ethicflow-prod (P0v3)   │
│ API App              │ app-ethicflow-api-dev       │ app-ethicflow-api-prod      │
│ Web App              │ app-ethicflow-web-dev       │ app-ethicflow-web-prod      │
│ ACR                  │ acrethicflowdev             │ acrethicflowprod            │
│ Postgres             │ pg-ethicflow-dev (B1ms)     │ pg-ethicflow-prod (D2s_v3)  │
│ Database             │ ethicflow                   │ ethicflow                   │
│ Key Vault            │ kv-ethicflow-dev            │ kv-ethicflow-prod           │
│ Storage              │ stethicflowdev01            │ stethicflowprod01           │
│ App Insights         │ appi-ethicflow-dev          │ appi-ethicflow-prod         │
│ Log Analytics        │ law-ethicflow-dev           │ law-ethicflow-prod          │
│ VNet                 │ vnet-ethicflow-dev          │ vnet-ethicflow-prod         │
│ Frontend domain      │ dev.ethics.<inst>.ac.il     │ ethics.<inst>.ac.il         │
│ API domain           │ api.dev.ethics.<inst>.ac.il │ api.ethics.<inst>.ac.il     │
│ GitHub environment   │ dev                         │ production                  │
│ Service Principal    │ sp-ethicflow-github-dev     │ sp-ethicflow-github-prod    │
│ Microsoft App prefix │ EthicFlow * Dev             │ EthicFlow * Prod            │
│ Secret prefix in KV  │ ethicflow-dev               │ ethicflow-prod              │
└──────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

## Troubleshooting

### "Resource name already exists"

ACR / Storage / Postgres / Key Vault דורשים **שם ייחודי בכל Azure**. הוסף סיומת מספרית (`acrethicflowdev01`) ועדכן את `parameters.dev.json`.

### "Postgres deployment timeout"

יצירת Flexible Server עם VNet delegation לוקחת 10-15 דקות. אם נכשל — בדוק שה-Subnet `postgres-delegated` באמת נוצר עם הdelegation הנכון, ושאין רשת חופפת ב-Subscription.

### "App Service shows 'Application Error'"

```powershell
# הצג logs בזמן אמת
az webapp log tail --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"

# הצג logs אחרונים
az webapp log download --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev" --log-file dev-logs.zip
```

הסיבות הנפוצות:

- `DATABASE_URL` לא נטען (בדוק שב-App Settings יש את ה-Key Vault reference, ושה-Managed Identity של ה-App יש לה הרשאה ל-Key Vault).
- ה-Container לא מצליח לעלות לפורט 3000 (בדוק `WEBSITES_PORT=3000`).
- מיגרציות נכשלו (חפש `Prisma migrate` ב-logs).

### "Microsoft SSO redirect mismatch"

ודא שב-App Registration של אותה סביבה, תחת `Authentication → Redirect URIs`, מופיע במדויק:

```text
https://api.dev.ethics.<institution>.ac.il/api/auth/microsoft/callback
```

ושב-`MICROSOFT_AUTH_REDIRECT_URI` של ה-App Service יש בדיוק את אותו ערך (כולל `https://`, ללא slash בסוף).

### "Key Vault reference shows source=KeyVaultReference, status=Failed"

בדוק:

```powershell
az webapp identity show --resource-group "rg-ethicflow-dev" --name "app-ethicflow-api-dev"

az role assignment list --assignee <PRINCIPAL_ID> --scope $(az keyvault show --name "kv-ethicflow-dev" --query id -o tsv)
```

ודא שיש `Key Vault Secrets User`. אם לא — צור:

```powershell
az role assignment create `
  --assignee <PRINCIPAL_ID> `
  --role "Key Vault Secrets User" `
  --scope $(az keyvault show --name "kv-ethicflow-dev" --query id -o tsv)
```

### "GitHub Actions OIDC: AADSTS70021"

המשמעות: ה-`subject` של ה-Federated Credential לא תואם. ודא ש:

- `subject` הוא **בדיוק** `repo:<OWNER>/<REPO>:environment:dev` (case-sensitive).
- ב-workflow יש `permissions: id-token: write`.
- ה-job משתמש ב-`environment: dev` (או `production`).

---

## מסמכים קשורים

- `docs/ops/azure-appservice-checklist-he.md` — צ'קליסט מקוצר (מודל סלוטים).
- `docs/ops/azure-weekly-release-runbook-he.md` — ראנבוק שחרור שבועי.
- `infra/azure/appservice/README.md` — תיעוד טכני באנגלית של ה-Bicep.
- `infra/azure/appservice/parameters.example.json` — תבנית פרמטרים ל-Prod.
- `infra/azure/appservice/parameters.dev.example.json` — תבנית פרמטרים ל-Dev.
- `.github/workflows/deploy-azure.yml` — pipeline נוכחי (מודל סלוטים).
- `ops/scripts/deploy-azure-baseline.ps1` — סקריפט פריסת baseline.
- `ops/scripts/setup-microsoft-integrations.ps1` — יצירת Entra Apps.
- `ops/scripts/configure-appservice-domains.ps1` — הוספת דומיינים ו-TLS.
- `ops/scripts/set-azure-api-keyvault-settings.ps1` — חיבור App Settings ל-Key Vault.
- `ops/scripts/generate-prod-secrets.ps1` — יצירת סודות אקראיים.
- `ops/scripts/run-azure-slot-rollback-drill.ps1` — תרגיל rollback (slot-based; אפשר להתאים).

---

## Checklist קצר (להדפסה)

### חד-פעמי

- [ ] Subscription Active + הרשאות Owner.
- [ ] Resource Providers רשומים.
- [ ] שני דומיינים מוכנים ב-DNS.
- [ ] `parameters.dev.json` ו-`parameters.prod.json` מוכנים (לא ב-git).
- [ ] תשתית Dev הופעלה (`deploy-azure-baseline.ps1`).
- [ ] תשתית Prod הופעלה.
- [ ] Microsoft App Registrations ל-Dev ול-Prod.
- [ ] Key Vault מאוכלס בשתי הסביבות.
- [ ] App Settings מקושרים ל-Key Vault refs.
- [ ] Custom domains + Managed Certs.
- [ ] שני Service Principals ב-Entra עם Federated Credentials.
- [ ] שני GitHub Environments (`dev`, `production`) עם Secrets ו-reviewers.

### לפני כל שחרור ל-Prod

- [ ] Smoke ב-Dev עבר 100%.
- [ ] PR מאושר ב-`main`.
- [ ] רץ pipeline ל-`production`.
- [ ] Smoke אחרי deploy עבר.
- [ ] בדיקת login ידנית של 2 משתמשים אמיתיים.
- [ ] `/api/health` יציב 5 דקות.
- [ ] תיעוד שחרור (tag + release notes).
