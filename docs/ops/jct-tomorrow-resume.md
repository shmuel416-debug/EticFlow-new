# EthicFlow @ JCT — לקום מחר ולהמשיך

> מסמך **קצר ופעיל** עם כל מה שצריך לעשות מחר כדי להמשיך מאיפה שעצרנו.

## איפה עצרנו (19 במאי 2026, ~14:00)

✅ **Phase 0 הושלם:**
- Azure CLI + PowerShell 7 מותקנים.
- מחובר ל-Subscription `Azure plan` (`7a64b307-d38c-495e-b065-73618a1bdecf`) בטננט `acad.jct.ac.il` (`7b410031-6333-4080-9e61-afdbd57b3bd9`).
- כל 8 ה-Resource Providers `Registered` (כולל `Microsoft.DBforPostgreSQL` שה-IT רשמו לבקשתנו).
- Owner על `RG-ethics-net` (קיים ב-eastus2).
- `parameters.prod.json` עודכן עם שמות חדשים (`ethics-net`), region `eastus2`, ו-DB password אמיתי.
- `.gitignore` מסנן את `parameters.prod.json`.

🔴 **חוסם:** ה-IT צריכים להעניק ל-`goldb@acad.jct.ac.il` את ה-Entra Role **`Application Developer`** (`cf1c38e5-3621-4004-a7cb-879624dced7c`). בקשה נשלחה אליהם → "יטפלו מחר".

---

## פעולה ראשונה מחר — לאמת שה-IT השלימו

```powershell
cd C:\EticFlow

# וודא שאתה מחובר לטננט הנכון
az account show --query "{name:name, tenantId:tenantId}" -o table
# צריך לראות: Azure plan / 7b410031-6333-4080-9e61-afdbd57b3bd9

# בדוק שיש לי Application Developer
az rest --method GET --uri "https://graph.microsoft.com/v1.0/me/memberOf" --query "value[].displayName" -o tsv
```

→ אמור לראות `Application Developer` ברשימה. **אם כן — ממשיכים. אם לא — לחזור ל-IT.**

---

## Phase 1.1 — יצירת Service Principal (אחרי שאומת)

```powershell
$SUBSCRIPTION_ID = "7a64b307-d38c-495e-b065-73618a1bdecf"
$RG              = "RG-ethics-net"

$sp = az ad sp create-for-rbac `
  --name "sp-ethics-net-github-prod" `
  --role "Contributor" `
  --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" | ConvertFrom-Json

Write-Host ""
Write-Host "=== Save these values ===" -ForegroundColor Cyan
Write-Host "AZURE_CLIENT_ID    = $($sp.appId)" -ForegroundColor Yellow
Write-Host "Display Name       = $($sp.displayName)"
```

**שמור את `AZURE_CLIENT_ID`**.

---

## Phase 1.2 — Federated Credential ל-GitHub OIDC

```powershell
$APP_ID = "<AZURE_CLIENT_ID_FROM_1.1>"
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

---

## Phase 1.3 — יצירת GitHub Environment `production`

ב-https://github.com/shmuel416-debug/EticFlow-new:

1. Settings → Environments → New environment → `production`.
2. **Required reviewers**: הוסף את עצמך (`shmuel416-debug`).
3. **Deployment branches**: Selected branches → רק `main`.
4. הוסף Secrets (Environment secrets, לא Repository secrets):

| Secret | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | (מ-Phase 1.1) |
| `AZURE_TENANT_ID` | `7b410031-6333-4080-9e61-afdbd57b3bd9` |
| `AZURE_SUBSCRIPTION_ID` | `7a64b307-d38c-495e-b065-73618a1bdecf` |
| `AZURE_RESOURCE_GROUP` | `RG-ethics-net` |
| `AZURE_ACR_NAME` | `acrethicsnet` |
| `AZURE_API_APP_NAME` | `app-ethics-net-api` |
| `AZURE_WEB_APP_NAME` | `app-ethics-net-web` |
| `AZURE_API_BASE_URL` | `https://app-ethics-net-api.azurewebsites.net` (יעודכן ל-`https://api.ethics.jct.ac.il` אחרי Phase 4) |

---

## Phase 2 — פריסת תשתית Bicep

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "7a64b307-d38c-495e-b065-73618a1bdecf" `
  -ResourceGroupName "RG-ethics-net" `
  -Location "eastus2" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json"
```

צפי זמן: **15-25 דקות**. Postgres הכי איטי.

אחרי שמסיים — שמור outputs:

```powershell
az deployment group show `
  --resource-group "RG-ethics-net" `
  --name "main" `
  --query "properties.outputs" -o json
```

---

## Phases 3-9 — קצר

| Phase | מטרה | משך |
| --- | --- | --- |
| 3 | Microsoft Entra Apps + Key Vault + App Settings | ~30 דק (+ זמן המתנה לאישור IT לקונסנט) |
| 4 | דומיינים מותאמים (`ethics.jct.ac.il`) + Managed SSL | ~60 דק (כולל המתנה ל-DNS propagation) |
| 5 | Build + Push images דרך GitHub Actions | ~10 דק |
| 6 | Bootstrap DB + admin user | ~5 דק |
| 7 | Smoke SSO + Go/No-Go | ~30 דק |
| 8 | 72 שעות ניטור | passive |
| 9 | תפעול שוטף | ongoing |

המסמך המקיף: `docs/ops/jct-prod-runbook-he.md`.

---

## שאלות פתוחות שצריכות תשובה ב-Phase 3

### א. באיזה tenant יושב `ethicscommittee@jct.ac.il`?

ה-mailbox הוא `@jct.ac.il`, **לא** `@acad.jct.ac.il`. אם הוא יושב ב-CSP tenant (`2505863a-...`):
- Mail.Send + Calendar.ReadWrite App Registrations חייבות להיות שם.
- אתה לא יכול לייצר אותן בעצמך (אין לך הרשאה ב-CSP).
- צריך לבקש מ-IT ליצור אותן או להעניק לך Application Developer ב-CSP tenant גם.

### ב. באיזה tenant הם המשתמשים של ועדת האתיקה?

- אם ב-`acad.jct.ac.il` → SSO App Registration יכול להיות שם, אתה יכול לבד.
- אם ב-`jct.ac.il` → SSO צריך להיות שם, צריך IT.

**איך לבדוק**: שאל את IT, או:
```powershell
az ad user show --id "someuser@jct.ac.il" --query "{upn:userPrincipalName, tenant:onPremisesSamAccountName}" -o table
```

---

## פקודות שימושיות לדיבאג

```powershell
# הסטטוס שלי בכל הטננטים
az account list --query "[].{name:name, id:id, tenant:tenantId, default:isDefault}" -o table

# הרשאות שיש לי
az role assignment list --assignee $((az ad signed-in-user show --query id -o tsv)) --all `
  --query "[].{role:roleDefinitionName, scope:scope}" -o table

# התפקידים שלי ב-Entra
az rest --method GET --uri "https://graph.microsoft.com/v1.0/me/memberOf" --query "value[].displayName" -o tsv

# בדיקה שה-RG עדיין שם
az group show --name "RG-ethics-net" -o table
```

---

## מבנה התיקיות (תזכורת)

```
C:\EticFlow\
├── infra/azure/appservice/
│   ├── main.bicep                       ← תבנית Bicep (עם פרמטרי SKU)
│   ├── parameters.prod.json             ← הקובץ שלי (DB password, גיט-עיוור)
│   ├── parameters.example.json          ← template ב-git
│   └── README.md
├── ops/scripts/
│   ├── deploy-azure-baseline.ps1        ← הפריסה הראשית
│   ├── generate-prod-secrets.ps1        ← יצירת סודות (כבר רץ)
│   ├── setup-microsoft-integrations.ps1 ← Entra Apps (Phase 3)
│   ├── configure-appservice-domains.ps1 ← דומיינים (Phase 4)
│   └── set-azure-api-keyvault-settings.ps1
├── .github/workflows/
│   └── deploy-azure.yml                 ← CI/CD (direct mode)
└── docs/ops/
    ├── jct-prod-runbook-he.md           ← המדריך המקיף (עם סטטוס דינמי)
    ├── jct-it-handoff.md                ← הבקשה ל-IT
    └── jct-tomorrow-resume.md           ← הקובץ הזה
```

---

## בהצלחה!

— תיעוד נכתב ע"י סוכן הפיתוח, 19 במאי 2026.
