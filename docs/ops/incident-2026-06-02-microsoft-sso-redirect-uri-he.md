# תקלה: Microsoft SSO נכשל עם AADSTS50011 (redirect URI mismatch)

| שדה | ערך |
| --- | --- |
| תאריך | 2026-06-02 |
| חומרה | גבוהה (התחברות דרך Microsoft הושבתה לכלל המשתמשים) |
| רכיב | Auth / Microsoft Entra SSO |
| App Registration | `Ethic-Net SSO` — `4190c9af-661d-479a-89c4-b4909ce35203` |
| Tenant | `7b410031-6333-4080-9e61-afdbd57b3bd9` (acad.jct.ac.il) |
| סטטוס | נפתר ע"י הוספת redirect URI קנוני ל-App Registration |

## הסימפטום

בלחיצה על "התחברות עם Microsoft" הוחזרה השגיאה:

```
AADSTS50011: The redirect URI
'https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback'
specified in the request does not match the redirect URIs configured
for the application '4190c9af-661d-479a-89c4-b4909ce35203'.
```

שאר האתר תקין — רק מסלול ה-SSO של Microsoft נכשל.

## שורש הבעיה

ה-backend לא קורא את ה-redirect URI ממשתנה סביבה — הוא **גוזר אותו מתוך ה-host של הבקשה החיה** ב-`resolveMicrosoftCallbackUrl(req)` בקובץ
[backend/src/controllers/auth.controller.js](../../backend/src/controllers/auth.controller.js):

```js
const host = forwardedHost || req.get('host')
return `${protocol}://${host}/api/auth/microsoft/callback`
```

ערך זה נשלח ל-Microsoft גם ב-`getAuthUrl` וגם ב-`exchangeCode`
([backend/src/services/auth/microsoft.provider.js](../../backend/src/services/auth/microsoft.provider.js)).

עד לאחרונה ה-API הוגש דרך `app-ethics-net-api.azurewebsites.net`, וכתובת זו **הייתה רשומה** ב-App Registration — לכן ה-SSO עבד.

לאחר חיבור הדומיין המותאם **`ethics-net-api.jct.ac.il`** ל-App Service (Phase 4) ואכיפת הדומיין הקנוני, הבקשות החלו להגיע תחת ה-host החדש, וה-redirect URI הנגזר השתנה ל-`https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback`. כתובת זו **לא הייתה רשומה** ב-App Registration, ש-OAuth דורש התאמה מדויקת מראש שלה — ומכאן AADSTS50011.

### Redirect URIs שהיו רשומים בזמן התקלה
- `https://app-ethics-net-web.azurewebsites.net/api/auth/microsoft/callback`
- `https://app-ethics-net-api.azurewebsites.net/api/auth/microsoft/callback`

(חסר: `https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback`)

### למה דווקא ה-SSO נשבר ולא שאר האתר
OAuth/SSO הוא המסלול היחיד שבו ספק חיצוני (Microsoft) מאמת שה-`redirect_uri` נמצא ברשימת היתרים שהוגדרה מראש. כל שאר נתיבי האתר/ה-API לא דורשים רישום מוקדם אצל ספק חיצוני, ולכן המשיכו לעבוד תחת הדומיין החדש.

### שינויים רלוונטיים ב-repo (ציר הזמן)
- `5cc3df4` (2026-05-31) `fix(web): enforce canonical ethics-net domain` — הפניית nginx של ה-frontend לכל host שאינו `ethics-net.jct.ac.il`.
- `c03fd82` (2026-06-01) `docs(ops): align canonical JCT API hostname` — יישור ה-hostname הקנוני של ה-API ל-`ethics-net-api.jct.ac.il`.

## הפתרון (Azure בלבד, ללא שינוי קוד)

הוספת ה-redirect URI הקנוני ל-App Registration. שים לב: `--web-redirect-uris` **דורס** את כל הרשימה, לכן יש לכלול גם את הקיימים.

```powershell
az login --tenant 7b410031-6333-4080-9e61-afdbd57b3bd9

az ad app update --id 4190c9af-661d-479a-89c4-b4909ce35203 --web-redirect-uris `
  "https://app-ethics-net-web.azurewebsites.net/api/auth/microsoft/callback" `
  "https://app-ethics-net-api.azurewebsites.net/api/auth/microsoft/callback" `
  "https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback"
```

חלופה דרך Portal: Microsoft Entra ID → App registrations → `Ethic-Net SSO` → Authentication → Web → Redirect URIs → Add URI → `https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback` → Save.

### אימות
```powershell
az ad app show --id 4190c9af-661d-479a-89c4-b4909ce35203 --query "web.redirectUris" -o json
```
ולנסות התחברות Microsoft מחדש. ה-URI חייב להיות זהה בדיוק: `https://`, אותו host, ללא `/` בסוף.

### יישור הגדרות (מומלץ, לא חוסם)
לוודא ש-`MICROSOFT_AUTH_REDIRECT_URI` ב-App Service `app-ethics-net-api` מצביע ל-`https://ethics-net-api.jct.ac.il/api/auth/microsoft/callback`. הקוד גוזר מה-host ומתעלם מה-env, אך עדיף שיהיה עקבי.

## מניעה (Action Items)
- בכל שינוי דומיין עתידי של ה-API (custom domain חדש, slot, סביבה נוספת) — להוסיף את ה-redirect URI החדש ל-App Registration **לפני** המעבר.
- להוסיף בדיקת SSO לצ'קליסט שינוי הדומיין (`npm run smoke:sso` מול ה-host החדש).
- התיעוד וסקריפט ההגדרה [ops/scripts/setup-microsoft-integrations.ps1](../../ops/scripts/setup-microsoft-integrations.ps1) עדיין משתמשים בתבנית `api.ethics-net.<institution>`, בעוד שב-JCT ה-hostname הקנוני הוא `ethics-net-api.jct.ac.il` — כדאי ליישר כדי למנוע בלבול דומה.
