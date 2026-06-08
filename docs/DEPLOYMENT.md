# Ethic-Net — Deployment Guide

## Quick Start (Development)

```bash
# 1. Clone & setup
git clone https://github.com/shmuel416-debug/Ethic-Net.git
cd Ethic-Net
chmod +x setup.sh
./setup.sh            # Interactive wizard — creates .env + starts DB

# 2. Start development
cd backend && npm run dev       # API at localhost:5000
cd frontend && npm run dev      # App at localhost:5173

# 3. Open browser
# App: http://localhost:5173
# pgAdmin: http://localhost:5050
```

## Production Deployment

### Prerequisites
- Linux server (Ubuntu 22+ recommended)
- Docker + Docker Compose V2
- Domain name + SSL certificate
- SMTP server for emails

### Step 1: Clone & Configure
```bash
git clone https://github.com/shmuel416-debug/Ethic-Net.git
cd Ethic-Net
chmod +x setup.sh
./setup.sh            # Choose "Production" when asked
```

### Step 2: SSL Certificate
```bash
mkdir -p nginx/ssl
# Copy your SSL files:
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
```

### Step 3: Start Production
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 4: Verify
```bash
# Check all containers running
docker compose ps

# Check API health
curl https://your-domain.ac.il/api/health

# Check logs
docker compose logs -f backend
```

## Azure App Service Deployment (Recommended)

This is the recommended production topology for stability:

- `app-ethic-net-web` (frontend container, Linux App Service)
- `app-ethic-net-api` (backend container, Linux App Service)
- PostgreSQL Flexible Server (private networking)
- Key Vault + Managed Identity
- App Insights + Log Analytics

For a concise Hebrew operator checklist, see:

- `docs/ops/azure-appservice-checklist-he.md`

### Prerequisites (Azure)

- Azure subscription + rights to create role assignments.
- Entra tenant with admin consent ability.
- Azure CLI + Bicep installed.
- Production DNS control for:
  - `ethics-net.<institution>.ac.il` (frontend)
  - `api.ethics-net.<institution>.ac.il` (backend)
- Chromium available in the backend container image (required for Puppeteer PDF rendering).
- Hebrew-capable fonts available in backend runtime (at least Noto Hebrew or embedded Heebo/David Libre).

### Step 1: Provision Azure resources

```bash
cd infra/azure/appservice
cp parameters.example.json parameters.prod.json
# Edit parameters.prod.json
az login
az account set --subscription "<SUBSCRIPTION_ID>"
az group create --name "rg-ethic-net-prod" --location "westeurope"
az deployment group create \
  --resource-group "rg-ethic-net-prod" \
  --template-file "main.bicep" \
  --parameters "@parameters.prod.json"
```

Or use the helper script:

```powershell
pwsh ./ops/scripts/deploy-azure-baseline.ps1 `
  -SubscriptionId "<SUBSCRIPTION_ID>" `
  -ResourceGroupName "rg-ethic-net-prod" `
  -TemplateFile "infra/azure/appservice/main.bicep" `
  -ParametersFile "infra/azure/appservice/parameters.prod.json"
```

The template provisions:

- App Service Plan (PremiumV3)
- Web App + API App (Linux containers)
- ACR
- PostgreSQL Flexible Server + private DNS
- Storage account + file shares (`uploads`, `generated`)
- Key Vault
- Log Analytics + App Insights

### Step 2: Build and push container images

```bash
ACR_NAME="acrethic-netprod"
TAG="$(git rev-parse --short HEAD)"

az acr login --name "$ACR_NAME"
docker build -t "$ACR_NAME.azurecr.io/ethic-net-api:$TAG" ./backend
docker build -t "$ACR_NAME.azurecr.io/ethic-net-web:$TAG" ./frontend
docker push "$ACR_NAME.azurecr.io/ethic-net-api:$TAG"
docker push "$ACR_NAME.azurecr.io/ethic-net-web:$TAG"
```

### Step 3: Configure Microsoft integrations (single-tenant)

Run the provisioning script:

```bash
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 \
  -TenantId "<TENANT_GUID>" \
  -BaseUrl "https://api.ethics-net.<institution>.ac.il" \
  -OrganizerEmail "ethics@<institution>.ac.il" \
  -FrontendLogoutUrl "https://ethics-net.<institution>.ac.il/login" \
  -KeyVaultName "kv-ethic-net-prod" \
  -SecretPrefix "ethic-net-prod"
```

The script creates three app registrations:

- `Ethic-Net SSO` (Delegated: `openid profile email User.Read`)
- `Ethic-Net Mail` (Application: `Mail.Send`)
- `Ethic-Net Calendar` (Application: `Calendars.ReadWrite`)

All are created as **single-tenant** (`AzureADMyOrg`).

### Step 4: Configure App Settings

Set these on API App Service:

```env
NODE_ENV=production
PORT=3000
WEBSITES_PORT=3000
PUPPETEER_SKIP_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
FRONTEND_URL=https://ethics-net.<institution>.ac.il
ADMIN_BOOTSTRAP_EMAIL=admin@<institution>.ac.il
ADMIN_BOOTSTRAP_PASSWORD=<strong-random-password>
AUTH_PROVIDER=microsoft
EMAIL_PROVIDER=microsoft
CALENDAR_PROVIDER=microsoft
STORAGE_PROVIDER=local
MICROSOFT_AUTH_REDIRECT_URI=https://api.ethics-net.<institution>.ac.il/api/auth/microsoft/callback
MICROSOFT_CALENDAR_ORGANIZER_EMAIL=ethics@<institution>.ac.il
```

PDF generation notes:

- Backend now uses a single HTML -> PDF pipeline via Puppeteer for approval letters and protocols.
- On Linux containers, install `chromium` plus Hebrew fonts (`font-noto-hebrew` recommended).
- If `PUPPETEER_EXECUTABLE_PATH` is missing or invalid, backend startup should fail fast rather than silently rendering degraded Hebrew output.

Set these on frontend App Service:

```env
WEBSITES_PORT=80
BACKEND_URL=https://api.ethics-net.<institution>.ac.il
```

Store sensitive values (`DATABASE_URL`, JWT secrets, Microsoft client secrets) in Key Vault and map via Key Vault references.
The provided Bicep template already creates a `database-url` secret and wires `DATABASE_URL` to that Key Vault reference.

You can apply the API app settings + Key Vault references with:

```powershell
pwsh ./ops/scripts/set-azure-api-keyvault-settings.ps1 `
  -ResourceGroupName "rg-ethic-net-prod" `
  -ApiAppName "app-ethic-net-api-prod" `
  -KeyVaultName "kv-ethic-net-prod" `
  -FrontendUrl "https://ethics-net.<institution>.ac.il" `
  -ApiBaseUrl "https://api.ethics-net.<institution>.ac.il" `
  -OrganizerEmail "ethics@<institution>.ac.il" `
  -SecretPrefix "ethic-net-prod"
```

### Step 5: Domain and TLS

- Add custom domains to each app:
  - Web app: `ethics-net.<institution>.ac.il`
  - API app: `api.ethics-net.<institution>.ac.il`
- Complete DNS validation (`asuid` TXT/CNAME as requested by App Service).
- Enable Managed Certificates on both domains.
- Enforce HTTP -> HTTPS redirect at edge.

#### Required security headers on frontend host

Configure these headers on the static frontend host/CDN (not only API):

- `Content-Security-Policy`:
  - `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://ethics-net-api.jct.ac.il; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

### Step 6: Bootstrap database

```bash
cd backend
ADMIN_BOOTSTRAP_EMAIL=admin@<institution>.ac.il ADMIN_BOOTSTRAP_PASSWORD="<strong-password>" npm run bootstrap:prod
```

### Step 7: Smoke and go-live

```bash
SMOKE_BASE_URL=https://api.ethics-net.<institution>.ac.il SMOKE_ASSERT=1 npm run smoke:sso
```

Manual verification:

- Microsoft login succeeds from the production login page.
- Exchange code replay fails (one-time use).
- Password reset email is sent from Microsoft mailbox.
- Calendar event creation appears in Outlook organizer calendar.

### Step 8: Staged releases (recommended)

- Create `staging` deployment slots for both apps.
- Deploy to slot first (`auto_swap=false`), run smoke tests, then slot swap.
- Keep rollback by swapping back to previous slot.
- Use this as the default environment strategy:
  - `staging` = cloud DEV/UAT
  - `production` = live traffic only

## Environment Comparison

| Aspect | DEV | PROD |
|--------|-----|------|
| Start command | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Backend | `npm run dev` (nodemon) | Docker container (node) |
| Frontend | `npm run dev` (Vite HMR) | Docker container (Nginx) |
| DB exposed | localhost:5432 | Internal only |
| pgAdmin | localhost:5050 | Not available |
| Email | Console (terminal) | SMTP |
| Storage | ./uploads/ | S3/Azure Blob |
| SSL | Not needed | Required |
| AI | Mock | Gemini/OpenAI |

## Backup & Restore

```bash
# Backup database
docker compose exec db pg_dump -U ethic-net ethic-net > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260101.sql | docker compose exec -T db psql -U ethic-net ethic-net

# Backup uploads
tar czf uploads_$(date +%Y%m%d).tar.gz uploads/
```

## Production Hardening Checklist

Before each release, verify:

- Secrets are stored in environment variables only (never committed to Git).
- JWT secret rotated periodically and after any incident.
- `FRONTEND_URL` is set to the exact production frontend origin (no wildcard/fallback).
- `AUTH_EXCHANGE_TTL_MS` is short (recommended 60-120 seconds).
- `EMAIL_PROVIDER`, `AI_PROVIDER`, `STORAGE_PROVIDER`, `CALENDAR_PROVIDER` are explicitly set in production.
- Backup restore drill was executed in the last 30 days (DB + uploads).
- Health check endpoint monitored (`/api/health`) with alerting.
- Rollback command validated on the current release.

Suggested restore drill cadence:

```bash
# 1) Restore DB to a staging clone
cat backup_YYYYMMDD.sql | docker compose exec -T db psql -U ethic-net ethic-net

# 2) Restore uploads archive
tar xzf uploads_YYYYMMDD.tar.gz

# 3) Validate application health
curl https://your-domain.ac.il/api/health
```

## Rollback Drill Runbook (Sprint 9)

Use this in staging/clone before each production release:

```bash
# 0) Validate compose files
docker compose -f docker-compose.yml -f docker-compose.prod.yml config -q

# 1) Record current release image tags
docker compose -f docker-compose.yml -f docker-compose.prod.yml images

# 2) Deploy candidate release
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3) Smoke after deploy
node backend/tests/manual/daily-production-smoke.mjs

# 4) Roll back to previous image tags if smoke fails
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Evidence must be captured in:
- `docs/ops/drills/` (drill report)
- `docs/ops/smoke-history/` (smoke output)

## Operational Go/No-Go Criteria (Sprint 10)

Approve production release only when all checks pass:

- Runtime rollback drill completed in staging/clone with measured RTO and successful post-rollback smoke.
- Backup/restore drill completed in clean clone DB with data validation and measured RPO.
- Daily smoke has no High/Critical open failures in the last 7 consecutive runs.
- Quality gates pass on release candidate (`lint`, `build`, `tests`, `e2e`).

No-Go triggers (must stop release):

- Rollback drill failed or recovery exceeds agreed RTO threshold.
- Restore validation failed (missing/incorrect critical data) or RPO above target.
- Health endpoint instability or repeated 5xx spikes on core endpoints.
- Any unresolved Critical incident in the last release window.

## Update Procedure

```bash
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec backend npx prisma migrate deploy
```

---

## Microsoft Integration Setup (Sprint 7)

All Microsoft features are **opt-in** via `.env`. The system works fully without them.

### Prerequisites
- Azure AD tenant (Microsoft 365 or Azure subscription)
- Global Admin or Application Admin role to register apps

---

### 1. Microsoft Email (Graph API)

**Azure Portal → App registrations → New registration**

| Setting | Value |
|---------|-------|
| Name | Ethic-Net Mail |
| Supported account types | Single tenant |
| Redirect URI | (leave empty) |

**API permissions → Add → Microsoft Graph → Application:**
- `Mail.Send`

**Grant admin consent** → ✅

**Certificates & secrets → New client secret** → copy value

**`.env` configuration:**
```env
EMAIL_PROVIDER=microsoft
MICROSOFT_MAIL_CLIENT_ID=<Application (client) ID>
MICROSOFT_MAIL_CLIENT_SECRET=<Secret Value>
MICROSOFT_MAIL_TENANT_ID=<Directory (tenant) ID>
SMTP_FROM=ethics@yourinstitution.ac.il
SMTP_FROM_NAME=ועדת האתיקה
```

> **Note:** `SMTP_FROM` must be a licensed Exchange/Microsoft 365 mailbox in your tenant.

---

### 2. Microsoft Calendar (Graph API)

**Create a new App registration** (or reuse the Mail app):

**API permissions → Add → Microsoft Graph → Application:**
- `Calendars.ReadWrite`

**Grant admin consent** → ✅

**`.env` configuration:**
```env
CALENDAR_PROVIDER=microsoft
MICROSOFT_CALENDAR_CLIENT_ID=<Application (client) ID>
MICROSOFT_CALENDAR_CLIENT_SECRET=<Secret Value>
MICROSOFT_CALENDAR_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_CALENDAR_ORGANIZER_EMAIL=ethics@yourinstitution.ac.il
```

> When a meeting is created in Ethic-Net, it will appear in the organizer's Outlook calendar and send invites to all attendees.
> If the Graph API call fails, meeting creation still succeeds (graceful degradation).

---

### 3. Microsoft SSO / Entra ID

**Create a new App registration:**

| Setting | Value |
|---------|-------|
| Name | Ethic-Net SSO |
| Supported account types | Single tenant (organization only) |
| Redirect URI | `https://yourdomain.com/api/auth/microsoft/callback` |

**Authentication:**
- Platform: Web
- Redirect URI: `https://yourdomain.com/api/auth/microsoft/callback`
- Front-channel logout URL: `https://your-frontend-domain/login`
- ID tokens: ✅ (under Implicit grant)

**API permissions → Delegated (not Application):**
- `openid`
- `profile`
- `email`
- `User.Read`

**`.env` configuration:**
```env
MICROSOFT_AUTH_CLIENT_ID=<Application (client) ID>
MICROSOFT_AUTH_CLIENT_SECRET=<Secret Value>
MICROSOFT_AUTH_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_AUTH_REDIRECT_URI=https://yourdomain.com/api/auth/microsoft/callback
```

**How it works:**
1. User clicks "כניסה עם Microsoft" on the login page
2. Redirected to `GET /api/auth/microsoft` → redirects to Microsoft login
3. Microsoft redirects to `/api/auth/microsoft/callback?code=...`
4. Backend exchanges code → gets user profile → creates/finds user → creates one-time exchange code
5. User redirected to `/sso-callback?code=...` → frontend exchanges code for JWT → dashboard

**First-time SSO users:** Created automatically as `RESEARCHER` role. Admin can promote via Users page.

**Email conflict:** If the email already exists with local password auth, the user sees a Hebrew error and is asked to use email/password instead.

---

## Google Integration Setup

All three Google integrations are **opt-in** and independent. The system works without any Google credentials.

### Prerequisites: Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g. "Ethic-Net")
3. Enable the APIs you need (Calendar API, Gmail API, Google+ API)

---

### Google Calendar Sync

**When to use:** Create meetings in Ethic-Net → they automatically appear in Google Calendar with attendee invites.

**Setup:**
1. Google Cloud Console → IAM & Admin → Service Accounts → Create Service Account
2. Grant role: "Service Account Token Creator"
3. Keys tab → Add Key → JSON → download file
4. Share your Google Calendar with the service account email (give "Make changes to events" permission)
5. For Google Workspace + domain-wide delegation: enable it in the service account + authorize `https://www.googleapis.com/auth/calendar` scope

```env
CALENDAR_PROVIDER=google
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}   # inline JSON
# OR
GOOGLE_CALENDAR_CREDENTIALS=/secrets/google-calendar.json                   # file path
GOOGLE_CALENDAR_ID=ethics@institution.ac.il                                  # or 'primary'
GOOGLE_CALENDAR_IMPERSONATE=ethics@institution.ac.il                         # Workspace only
```

---

### Gmail API (Organizational Email)

**When to use:** Send system emails (password reset, notifications) from your institution's Gmail address.

**Setup:**
1. Google Cloud Console → Enable Gmail API
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID → Desktop app
3. Download the `credentials.json` file
4. Generate a refresh token (one-time, offline):
   ```bash
   # From backend directory:
   node -e "
   const { google } = require('googleapis');
   const c = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob');
   console.log(c.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/gmail.send'] }));
   "
   # Open the URL → authorize → copy the code → run:
   node -e "
   const { google } = require('googleapis');
   const c = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, 'urn:ietf:wg:oauth:2.0:oob');
   c.getToken('PASTE_CODE_HERE').then(r => console.log(r.tokens.refresh_token));
   "
   ```

```env
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=<OAuth2 Client ID>
GMAIL_CLIENT_SECRET=<OAuth2 Client Secret>
GMAIL_REFRESH_TOKEN=<Refresh Token from above>
SMTP_FROM=ethics@institution.ac.il
SMTP_FROM_NAME=ועדת אתיקה
```

---

### Google SSO (Login with Google)

**When to use:** Let users sign in with their Google / Google Workspace account. Useful for institutions using Google Workspace for Education.

**Setup:**
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID → **Web application**
2. Authorized redirect URIs:
   - Dev: `http://localhost:5000/api/auth/google/callback`
   - Prod: `https://yourdomain.com/api/auth/google/callback`
3. (Optional) Restrict to your Google Workspace domain via `GOOGLE_AUTH_ALLOWED_DOMAIN`

```env
GOOGLE_AUTH_CLIENT_ID=<Web Client ID>
GOOGLE_AUTH_CLIENT_SECRET=<Web Client Secret>
GOOGLE_AUTH_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
GOOGLE_AUTH_ALLOWED_DOMAIN=lev.ac.il    # leave empty for any Google account
```

**How it works:**
1. User clicks "כניסה עם Google" on the login page
2. Redirected to `GET /api/auth/google` → redirects to Google OAuth consent screen
3. Google redirects to `/api/auth/google/callback?code=...`
4. Backend exchanges code → gets user profile → creates/finds user → creates one-time exchange code
5. User redirected to `/sso-callback?code=...` → frontend exchanges code for JWT → dashboard

**First-time SSO users:** Created automatically as `RESEARCHER` role. Admin can promote via Users page.

**Email conflict:** If the email already exists (local or Microsoft SSO), the user sees a Hebrew error and is asked to use the original login method.
