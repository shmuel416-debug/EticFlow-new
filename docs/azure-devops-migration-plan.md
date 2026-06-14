# Ethic-Net — תכנית מעבר מ-GitHub ל-Azure DevOps

**מטרה:** העברת כל הקוד (היסטוריה, branches, tags) ל-Azure DevOps Repos, המרת הדפלוי ל-Azure Pipelines, וקביעת Azure DevOps כמקור האמת היחיד — **בלי לפגוע בדפלוי הקיים בשום שלב**.

**עיקרון מוביל:** GitHub נשאר חי ופעיל עד שה-pipeline ב-Azure DevOps מוכיח דפלוי מוצלח מקצה לקצה. רק אז עוברים (cutover) ומארכבים את GitHub. אפס "big bang".

---

## מצב נוכחי (snapshot)

| רכיב | מצב |
|------|-----|
| מקור הקוד | GitHub — `github.com/shmuel416-debug/EticFlow-new.git` |
| גודל ריפו | ~146KB pack, 8 tags, ענפי `main` + feature/fix |
| דפלוי | `.github/workflows/deploy-azure.yml` — **ידני** (`workflow_dispatch`), בונה Docker images → דוחף ל-ACR → מעדכן App Service |
| אימות לדפלוי | **OIDC** (workload identity federation), ללא client secret. Service Principal עם 9 secrets ברמת GitHub Environment |
| CI נוסף | `quality-gates`, `codeql`, `daily-smoke`, `dependency-review`, `security-scans` + Dependabot |
| טריגר דפלוי | אינו על push — ידני בלבד. ⇒ עצם העברת הריפו לא יפעיל דפלוי בטעות |

**התובנה הקריטית:** אותו Service Principal יכול לשרת גם את GitHub וגם את Azure DevOps במקביל — פשוט מוסיפים **federated credential שני** ל-App Registration. כך הדפלוי הישן ממשיך לעבוד בזמן שבונים ובודקים את החדש.

---

## שלב 0 — הכנה (ללא נגיעה בקוד)

- [ ] לוודא הרשאות: בעלות/Project Administrator על ארגון Azure DevOps (או ליצור ארגון חדש ב-`dev.azure.com`).
- [ ] לאסוף את 9 ערכי ה-secrets של הדפלוי הקיים (מ-GitHub → Settings → Environments → production):
  `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AZURE_ACR_NAME`, `AZURE_API_APP_NAME`, `AZURE_WEB_APP_NAME`, `AZURE_API_BASE_URL` (+ secrets של smoke/E2E אם רלוונטי).
- [ ] לזהות אילו branches באמת צריך להעביר. כרגע יש המון ענפי `cursor/*` ו-`dependabot/*` ב-origin — **לא** להעביר אותם; להעביר רק `main` + הענפים הפעילים (`feature/workflow-gaps`, `fix/*`, `sign-email-actions`, `feat/azure-bicep-cleanup-and-phase3-prep`) ואת כל ה-tags.

---

## שלב 1 — יצירת הפרויקט וה-Repo ב-Azure DevOps

- [ ] ב-`dev.azure.com/<org>` → **New Project** → שם `Ethic-Net`, Visibility: Private, Version control: Git.
- [ ] ב-Project → Repos → ליצור ריפו ריק בשם `EticFlow` (לא לאתחל עם README — נדחוף היסטוריה מלאה).

---

## שלב 2 — העברת הקוד עם כל ההיסטוריה (mirror נקי וסלקטיבי)

מעבירים את `main`, הענפים הפעילים והתגיות — בלי לגרור את עשרות ענפי ה-`cursor/*`/`dependabot/*`.

```powershell
# מתוך C:\EticFlow
# 1) להוסיף remote ל-Azure DevOps (אימות: PAT או Git Credential Manager)
git remote add azure https://<org>@dev.azure.com/<org>/Ethic-Net/_git/EticFlow

# 2) לדחוף את main + כל התגיות
git push azure main
git push azure --tags

# 3) לדחוף רק את הענפים הפעילים שבחרנו (דוגמה)
git push azure feature/workflow-gaps fix/researcher-submit-pdf-hebrew `
               fix/status-error-messages sign-email-actions `
               feat/azure-bicep-cleanup-and-phase3-prep
```

> אם בכל זאת רוצים העתק מלא 1:1 כולל כל הענפים: `git clone --mirror <github-url>` ואז `git push --mirror azure`. לא מומלץ פה בגלל רעש ענפי ה-bot.

- [ ] לאמת ב-Azure DevOps → Repos → Branches + Tags שהכל הגיע (8 tags, `main` עם ה-HEAD הנכון `e4945a5`).
- [ ] ב-Project Settings → Repos → להגדיר את `main` כ-**Default branch**.

---

## שלב 3 — "כל קומיט עובר לשם" (החלפת origin)

לאחר אימות שהקוד הגיע — מפנים את העבודה היומיומית ל-Azure DevOps:

```powershell
# לשנות את שם ה-remote הישן (לא למחוק עדיין — גיבוי)
git remote rename origin github-old
# להפוך את azure ל-origin
git remote rename azure origin
git branch --set-upstream-to=origin/main main
```

מעכשיו `git push` רגיל → Azure DevOps. כל קומיט/push זורם לשם אוטומטית.

- [ ] להגדיר **Branch Policies** על `main` (Project Settings → Repos → Branches → main → Policies): דרישת Pull Request, build validation (אחרי שלב 4), מינימום reviewer אחד — מקביל להגנת ה-branch ב-GitHub.

---

## שלב 4 — המרת ה-CI (quality-gates) ל-Azure Pipelines

ממירים את `quality-gates.yml` ל-`azure-pipelines.yml` בשורש. שלושת ה-jobs (backend tests + prisma validate, frontend lint+build, e2e) הופכים ל-stages. הטריגר: `main` + PR.

```yaml
# azure-pipelines.yml (CI — שווה-ערך ל-quality-gates.yml)
trigger:
  branches: { include: [main] }
pr:
  branches: { include: [main] }

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Quality
    jobs:
      - job: backend
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '22.x' }
          - script: npm ci
            workingDirectory: backend
          - script: npx prisma validate
            workingDirectory: backend
          - script: npm test
            workingDirectory: backend
            env:
              DATABASE_URL: $(DATABASE_URL)   # מ-Variable Group
      - job: frontend
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '22.x' }
          - script: npm ci && npm run lint && npm run build
            workingDirectory: frontend
```

- [ ] להוסיף **Variable Group** בשם `eticnet-ci` (Pipelines → Library) עם `DATABASE_URL` ושאר ה-`E2E_*` (כסודות). לקשר ל-pipeline.
- [ ] את ה-E2E (Playwright) להוסיף כ-job נוסף עם תנאי "להריץ רק אם הסודות מוגדרים" (כמו ב-GitHub).

---

## שלב 5 — המרת הדפלוי ל-Azure Pipelines (הלב של המשימה)

### 5א. Service Connection עם OIDC (ללא secret)
1. ב-Azure DevOps → Project Settings → **Service connections** → New → **Azure Resource Manager** → **Workload Identity federation (automatic)** → לבחור את ה-Subscription וה-Resource Group (`rg-ethicnet-jct`).
2. זה יוצר/מקשר App Registration. **חשוב:** אפשר לכוון אותו לאותו Service Principal הקיים (`AZURE_CLIENT_ID`) — Azure DevOps ירשום עליו **federated credential נוסף** (issuer של Azure DevOps), בלי לגעת ב-federated credential של GitHub. כך הדפלוי הישן נשאר תקין.
3. לוודא של-SP יש את ההרשאות הקיימות: `AcrPush` על ה-ACR + `Contributor`/`Website Contributor` על ה-App Service.

### 5ב. Variable Group לדפלוי
- [ ] Library → Variable Group `eticnet-deploy-prod` עם 8 המשתנים (`AZURE_RESOURCE_GROUP`, `AZURE_ACR_NAME`, `AZURE_API_APP_NAME`, `AZURE_WEB_APP_NAME`, `AZURE_API_BASE_URL`, וכו'). `AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID` מטופלים ע"י ה-Service Connection.

### 5ג. פייפליין הדפלוי
ממירים את `deploy-azure.yml` ל-`azure-pipelines-deploy.yml`, **שומרים על אותה לוגיקה**: ידני (`trigger: none`), פרמטרים ל-`direct`/`slots`, בנייה+push ל-ACR, עדכון App Service, health check, smoke (`npm run smoke:sso`). שלד:

```yaml
# azure-pipelines-deploy.yml
trigger: none                      # ידני בלבד — שווה-ערך ל-workflow_dispatch
parameters:
  - name: deployMode
    type: string
    default: direct
    values: [direct, slots]
variables:
  - group: eticnet-deploy-prod
pool: { vmImage: ubuntu-latest }
stages:
  - stage: BuildAndPush
    jobs:
      - job: build
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: 'svc-ethicnet-azure'   # שם ה-Service Connection
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                TAG=$(echo $(Build.SourceVersion) | cut -c1-12)
                az acr login --name "$(AZURE_ACR_NAME)"
                REG="$(AZURE_ACR_NAME).azurecr.io"
                docker build -t $REG/ethic-net-api:$TAG ./backend && docker push $REG/ethic-net-api:$TAG
                docker build -t $REG/ethic-net-web:$TAG ./frontend && docker push $REG/ethic-net-web:$TAG
                echo "##vso[task.setvariable variable=imageTag;isOutput=true]$TAG"
  - stage: DeployDirect
    condition: eq('${{ parameters.deployMode }}', 'direct')
    jobs:
      - deployment: deploy
        environment: production         # Environment ב-Azure DevOps (עם approvals אם רוצים)
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'svc-ethicnet-azure'
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      # az webapp config container set ... + az webapp restart  (API + Web)
                      # ואז health check על $(AZURE_API_BASE_URL)/api/health
```

- [ ] להמיר גם את ענף ה-`slots` (deploy לסלוט staging → smoke → swap) באותו אופן — מיפוי 1:1 מהקובץ המקורי.
- [ ] ב-Pipelines → Environments → ליצור `production` ולהוסיף **Approval check** (מקביל ל-GitHub Environment protection).

---

## שלב 6 — בדיקת אש (לפני ניתוק GitHub)

זהו ה-gate. **GitHub עדיין חי כאן.**

- [ ] להריץ את ה-CI pipeline על `main` → לוודא backend/frontend ירוקים.
- [ ] להריץ את **deploy pipeline** במצב `direct` מ-Azure DevOps → לוודא:
  - build+push ל-ACR הצליח (tag = commit SHA).
  - App Service עודכן והופעל מחדש.
  - health check `/api/health` → 200.
  - `smoke:sso` עבר.
- [ ] לאמת ידנית שהאתר בפרודקשן עובד אחרי הדפלוי מ-Azure DevOps.

> אם משהו נכשל — מתקנים בלי לחץ; הדפלוי של GitHub עדיין זמין כ-fallback.

---

## שלב 7 — Cutover וסגירת GitHub

רק אחרי ששלב 6 ירוק במלואו:

- [ ] להעביר/לשחזר את ה-CI הנוסף ל-Azure DevOps לפי הצורך:
  - **CodeQL / security-scans / dependency-review** → Azure DevOps: להפעיל **Advanced Security for Azure DevOps** (code scanning + dependency scanning + secret scanning), או להשאיר זמנית ב-GitHub כ-read-only.
  - **Dependabot** → אין שווה-ערך מובנה ב-Azure DevOps; חלופות: Mend Renovate (extension חינמי ל-Azure DevOps) או task מתוזמן. להחליט בנפרד.
  - **daily-smoke** → Scheduled trigger ב-Azure Pipeline (`schedules:` cron).
- [ ] למחוק/להשבית את `deploy-azure.yml` ושאר ה-workflows מהריפו (כדי שלא ירוצו כפול).
- [ ] להסיר את ה-federated credential של GitHub מה-App Registration (לאחר שווידאנו שהחדש עובד).
- [ ] GitHub → Settings → **Archive repository** (קריאה-בלבד, שומר היסטוריה כגיבוי). לא למחוק לפחות חודש.
- [ ] להסיר את ה-remote הישן מקומית: `git remote remove github-old`.
- [ ] לעדכן docs: `README`, `docs/DEPLOYMENT.md`, `CLAUDE.md` (Git Workflow) — כתובות ה-clone והוראות הדפלוי.

---

## סיכום השפעה על הדפלוי

| שלב | האם הדפלוי בסיכון? |
|-----|---------------------|
| 1–4 (יצירת repo, push, origin, CI) | ❌ לא — דפלוי GitHub ממשיך לעבוד |
| 5 (בניית pipeline + federated credential שני) | ❌ לא — תוספת לצד הקיים, לא שינוי |
| 6 (בדיקת אש) | ❌ לא — GitHub זמין כ-fallback |
| 7 (cutover) | ⚠️ רק כאן מנתקים — ורק אחרי הוכחת הצלחה |

**הסיכון היחיד שדורש החלטה:** OIDC issuer שונה בין GitHub ל-Azure DevOps ⇒ חובה להוסיף federated credential חדש (שלב 5א). שאר המהלך additive ובטוח.
