# EthicFlow — ראנבוק שחרור שבועי ל-Azure

מסמך תפעולי קצר להרצת שחרור שבועי עם הפרדה ברורה בין DEV/UAT לבין Production.

## מודל סביבות (החלטה תפעולית)

- `production` slot = האתר החי.
- `staging` slot = אתר DEV/UAT בענן לפני עלייה לאוויר.
- פיתוח שוטף ממשיך מקומית (`docker` + `npm run dev`).

## שלב 1 — פריסת baseline (חד פעמי / שינוי תשתית)

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "<subscription-id>" `
  -ResourceGroupName "rg-ethicflow-prod" `
  -Location "westeurope" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json"
```

## שלב 2 — דומיין ו-TLS

1. הדפס ערכי אימות DNS (`asuid`) והכן רשומות DNS:

```powershell
pwsh ./ops/scripts/configure-appservice-domains.ps1 `
  -ResourceGroupName "rg-ethicflow-prod" `
  -WebAppName "app-ethicflow-web-prod" `
  -ApiAppName "app-ethicflow-api-prod" `
  -WebHostname "ethics.<institution>.ac.il" `
  -ApiHostname "api.ethics.<institution>.ac.il"
```

2. אחרי propagation, הרץ שוב עם `-ApplyBindings` כדי להוסיף hostname + Managed Certificate.

## שלב 3 — Microsoft + Key Vault references

```powershell
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 `
  -TenantId "<tenant-guid>" `
  -BaseUrl "https://api.ethics.<institution>.ac.il" `
  -OrganizerEmail "ethics@<institution>.ac.il" `
  -FrontendLogoutUrl "https://ethics.<institution>.ac.il/login" `
  -KeyVaultName "kv-ethicflow-prod" `
  -SecretPrefix "ethicflow-prod"
```

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

## שלב 4 — שחרור ל-staging (ללא swap)

ב-GitHub Actions workflow `Deploy Azure App Service`:

- `environment=production`
- `image_tag=<optional>`
- `auto_swap=false`

תוצאה צפויה: גרסה חדשה עולה רק ל-`staging` ומשמשת ל-DEV/UAT.

## שלב 5 — אישור Go/No-Go

תנאי חובה לפני שחרור:

- Smoke ל-SSO עובר על staging.
- `/api/health` יציב.
- בדיקת התחברות Microsoft + מייל + יומן עברה.
- אין תקלות Critical פתוחות.
- תרגיל rollback בוצע בהצלחה השבוע.

## שלב 6 — שחרור ל-production (swap בלבד)

אפשרות A (מועדפת): להריץ workflow שוב עם `auto_swap=true`.

אפשרות B (ידני):

```bash
az webapp deployment slot swap --resource-group "rg-ethicflow-prod" --name "app-ethicflow-api-prod" --slot staging --target-slot production
az webapp deployment slot swap --resource-group "rg-ethicflow-prod" --name "app-ethicflow-web-prod" --slot staging --target-slot production
```

## שלב 7 — תרגיל rollback

```powershell
pwsh ./ops/scripts/run-azure-slot-rollback-drill.ps1 `
  -ResourceGroupName "rg-ethicflow-prod" `
  -ApiAppName "app-ethicflow-api-prod" `
  -WebAppName "app-ethicflow-web-prod" `
  -ApiHealthUrl "https://api.ethics.<institution>.ac.il/api/health"
```

## נוהל DEV קבוע אחרי העלייה

- כל פיצ'ר נפרס קודם ל-`staging`.
- משתמשי DEV/UAT עובדים רק מול `staging`.
- רק אחרי אישור QA/PO מבצעים swap ל-production.
