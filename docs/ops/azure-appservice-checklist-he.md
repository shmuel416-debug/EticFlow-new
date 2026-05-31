# Ethic-Net — צ'קליסט Azure App Service (פרודקשן)

מסמך זה מרכז רק את המשימות שאתה צריך לבצע ב-Azure כדי להעלות את Ethic-Net לאוויר עם:

- התחברות Microsoft (Single-tenant)
- מיילים דרך Microsoft Graph
- יומן דרך Microsoft Graph

## 1) הכנות חשבון והרשאות

- [ ] יש לך `Subscription` פעיל ב-Azure.
- [ ] יש לך הרשאת `Contributor` לפחות על ה-Resource Group (עדיף `Owner`).
- [ ] יש לך הרשאות Entra Admin לאישור API permissions (או גורם מאשר זמין).
- [ ] יש תיבת מייל ארגונית פעילה (לדוגמה `ethics@<institution>.ac.il`).

## 2) פתיחת תשתית Azure (חד-פעמי)

- [ ] צור Resource Group לפרודקשן (לדוגמה `rg-ethic-net-prod`).
- [ ] הרץ את תבנית Bicep:
  - `infra/azure/appservice/main.bicep`
  - `infra/azure/appservice/parameters.example.json` (להעתיק ל-`parameters.prod.json` ולעדכן)
- [ ] לחלופין, הרץ סקריפט פריסה אוטומטי:
  - `pwsh ./ops/scripts/deploy-azure-baseline.ps1 -SubscriptionId "<subscription-id>"`
- [ ] ודא שנוצרו:
  - App Service Plan (PremiumV3)
  - Frontend App Service
  - Backend App Service
  - PostgreSQL Flexible Server
  - Key Vault
  - ACR
  - Storage Account
  - App Insights

## 3) דומיין ו-SSL

- [ ] הוסף Custom Domain ל-Frontend App Service:
  - `ethics.<institution>.ac.il`
- [ ] הוסף Custom Domain ל-Backend App Service:
  - `api.ethics.<institution>.ac.il`
- [ ] בצע DNS verification לפי ערכי `asuid`.
- [ ] הפעל Managed Certificate לשני הדומיינים.
- [ ] אפשר להוציא ערכי `asuid` ולהגדיר binding/cert עם:
  - `pwsh ./ops/scripts/configure-appservice-domains.ps1 ...`

## 4) Microsoft Apps (Single-tenant בלבד)

- [ ] הרץ:
  - `pwsh ./ops/scripts/setup-microsoft-integrations.ps1 -TenantId "<tenant-guid>" -BaseUrl "https://api.ethics.<institution>.ac.il" -OrganizerEmail "ethics@<institution>.ac.il" -FrontendLogoutUrl "https://ethics.<institution>.ac.il/login" -KeyVaultName "kv-ethic-net-prod"`
- [ ] ודא ש-`Ethic-Net SSO` מוגדר `Single tenant` (AzureADMyOrg).
- [ ] ודא שניתן `Admin consent` לכל ההרשאות:
  - SSO: `openid`, `profile`, `email`, `User.Read` (Delegated)
  - Mail: `Mail.Send` (Application)
  - Calendar: `Calendars.ReadWrite` (Application)

## 5) Key Vault + App Settings

- [ ] שמור סודות ב-Key Vault:
  - `DATABASE_URL`
  - `JWT_SECRET_CURRENT`
  - `MICROSOFT_AUTH_CLIENT_SECRET`
  - `MICROSOFT_MAIL_CLIENT_SECRET`
  - `MICROSOFT_CALENDAR_CLIENT_SECRET`
- [ ] חבר את ה-API App Service ל-Key Vault References.
- [ ] הגדר App Settings בסיסיים:
  - `AUTH_PROVIDER=microsoft`
  - `EMAIL_PROVIDER=microsoft`
  - `CALENDAR_PROVIDER=microsoft`
  - `FRONTEND_URL=https://ethics.<institution>.ac.il`
  - `MICROSOFT_AUTH_REDIRECT_URI=https://api.ethics.<institution>.ac.il/api/auth/microsoft/callback`
- [ ] אופציונלי: עדכון App Settings אוטומטי עם Key Vault references:
  - `pwsh ./ops/scripts/set-azure-api-keyvault-settings.ps1 ...`

## 6) פריסה והרצה

- [ ] בנה ודחוף images ל-ACR:
  - `ethic-net-api:<tag>`
  - `ethic-net-web:<tag>`
- [ ] פרוס ל-`staging` slots של web+api (ללא swap אוטומטי בשחרור ראשון).
- [ ] הרץ smoke:
  - `SMOKE_BASE_URL=https://api.ethics.<institution>.ac.il SMOKE_ASSERT=1 npm run smoke:sso`
- [ ] בצע slot swap ל-production.

## מדיניות DEV בענן

- [ ] השתמש ב-`staging` כאתר DEV/UAT קבוע בענן.
- [ ] השאר `production` ל-live בלבד.
- [ ] בצע swap ל-production רק אחרי אישור QA/Go-No-Go.

## 7) בדיקות Go-Live

- [ ] התחברות עם משתמש Microsoft מהטננט הארגוני עובדת.
- [ ] משתמש מטננט אחר נחסם (single-tenant enforcement).
- [ ] מייל איפוס סיסמה נשלח מהתיבה הארגונית.
- [ ] יצירת פגישה יוצרת event ב-Outlook ושולחת הזמנות.
- [ ] `/api/health` מחזיר 200 באופן יציב.
