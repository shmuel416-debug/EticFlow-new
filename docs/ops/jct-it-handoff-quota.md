# בקשה ל-IT של JCT — העלאת מכסת App Service בסבסקריפשן Azure

**נמען:** מנהל ה-Azure Subscription "Azure plan" של JCT (CSP partner)
**מבקש:** שמואל גולדברג, `goldb@acad.jct.ac.il`
**משך זמן:** ~2 דקות (טופס סטנדרטי, אישור Microsoft אוטומטי תוך 5-15 דקות)
**תאריך הבקשה:** 20 במאי 2026

---

## רקע

תודה על הענקת ה-`Application Developer` ב-PIM הבוקר — עבד. הצלחתי ליצור את ה-Service Principal ואת ה-Federated Credential ל-GitHub OIDC.

עכשיו אני מנסה לפרוס את תשתית ה-Bicep ל-`RG-ethics-net`, ונחסם על quota:

```text
SubscriptionIsOverQuotaForSku
Current Limit (Total VMs): 0
Current Usage: 0
Amount required for this deployment (Total VMs): 1
Region: East US 2
SKU: B1 (Basic)
```

ה-Subscription "Azure plan" (CSP) מגיע מ-Microsoft עם **quota = 0** ל-App Service workers, וזה צריך לעבור bump חד-פעמי.

ניסיתי לבקש דרך Portal (`Quotas blade` → `B1 VMs`) — הכפתור אפור, כי אין לי הרשאות ברמת ה-Subscription (אני Owner רק על ה-RG).

---

## הבקשה (חד-פעמית)

תעלו את מכסת `B1 VMs` ב-East US 2 על הסבסקריפשן `Azure plan`:

| Property | Value |
| --- | --- |
| **Subscription** | `Azure plan` (`7a64b307-d38c-495e-b065-73618a1bdecf`) |
| **Region** | `East US 2` |
| **Quota name** | `B1 VMs` (App Service Basic tier) |
| **Current limit** | `0` |
| **New limit** | `3` (מינימום נדרש = 1; 3 = רוחב נשימה לסקייל; לא משלמים על quota, רק על שימוש בפועל) |
| **Reason** | Production deployment of academic ethics review system (`ethics.jct.ac.il`) — single B1 App Service Plan hosting API + Web frontend |

### דרך פורטל (מומלץ)

1. https://portal.azure.com/#view/Microsoft_Azure_Capacity/QuotaMenuBlade/~/myQuotas
2. Provider: **App Service** | Subscription: **Azure plan** | Region: **East US 2**
3. סמן `B1 VMs` (ה-Limit כרגע = 0) → לחץ **"Request adjustment"** (העיפרון)
4. **New limit**: `3` | מלא Reason לפי הטבלה למעלה
5. Submit

### דרך CLI (אם פורטל לא מציג את ה-quota)

```powershell
az login --tenant "7b410031-6333-4080-9e61-afdbd57b3bd9"
az account set --subscription "7a64b307-d38c-495e-b065-73618a1bdecf"

az support tickets create `
  --ticket-name "ethic-net-b1-vms-quota-eastus2" `
  --description "Production deployment of academic ethics review system (ethics.jct.ac.il). Need B1 VMs quota raised from 0 to 3 in East US 2. RG=RG-ethics-net. Single App Service Plan hosts API + Web frontend." `
  --severity "minimal" `
  --issue-type "quota" `
  --quota-ticket-details quotaChangeRequests="[{region:eastus2,payload:'{\"SKU\":\"B1\",\"NewLimit\":3}'}]" `
                        quotaChangeRequestSubType="App Service" `
                        quotaChangeRequestVersion="1.0" `
  --contact-first-name "Shmuel" --contact-last-name "Goldberg" `
  --contact-method "email" --contact-email "goldb@acad.jct.ac.il" `
  --contact-language "en-us" --contact-country "IL" `
  --contact-timezone "Israel Standard Time"
```

---

## אלטרנטיבה (אם מעדיפים) — תנו לי הרשאה זמנית

במקום שתגישו את הבקשה — תוכלו להעניק לי **Quota Request Operator** (built-in role) על הסבסקריפשן `Azure plan`. אז אגיש בעצמי ואחזיר לכם דיווח. זה התפקיד הצר ביותר שעובד — לא נותן הרשאה לעשות שום דבר אחר על הסבסקריפשן.

```powershell
$myId = az ad user show --id "goldb@acad.jct.ac.il" --query id -o tsv
az role assignment create `
  --assignee $myId `
  --role "Quota Request Operator" `
  --scope "/subscriptions/7a64b307-d38c-495e-b065-73618a1bdecf"
```

תוקף: אפשר לוגית להגביל ל-7 ימים. אחרי שהמכסה תאושר ואתחיל את הפריסה — אפשר להסיר.

---

## למה רק `3` ולא יותר

- הסביבה היא **B1 (Basic)** — חד-instance, single tenant, low cost (~$13/חודש).
- ה-Bicep מגדיר **App Service Plan אחד** שמארח **שני App Services** (API + Web). שניהם רצים על אותו plan, אז זה רק **1 worker בפועל**.
- `3` נשאר לרזרבה רק אם נחליט בעתיד לפצל ל-2 plans או להוסיף slot.

---

## אימות אצלי

ברגע שהמכסה תאושר אקבל מ-Microsoft email ("Approved"), ואז אריץ:

```powershell
az deployment group what-if `
  --resource-group "RG-ethics-net" `
  --template-file "infra/azure/appservice/main.bicep" `
  --parameters "@infra/azure/appservice/parameters.prod.json"
```

אם החזרה היא רשימת `+ Create` של ~15 משאבים בלי `SubscriptionIsOverQuotaForSku` — ממשיכים. אחרת ארוץ שוב אליכם.

---

## SLA פיוצר

- Microsoft מאשרים `B1 VMs` quota bump **בד"כ אוטומטית תוך 5-15 דקות**, ללא צורך באישור אנושי.
- אם מסיבה כלשהי דורש review ידני — עד 8 שעות עסקים.

---

תודה!
שמואל גולדברג — `goldb@acad.jct.ac.il`
