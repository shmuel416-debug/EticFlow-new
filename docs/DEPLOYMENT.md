# EthicFlow — Deployment Guide

## Quick Start (Development)

```bash
# 1. Clone & setup
git clone https://github.com/shmuel416-debug/EthicFlow.git
cd EthicFlow
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
git clone https://github.com/shmuel416-debug/EthicFlow.git
cd EthicFlow
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
docker compose exec db pg_dump -U ethicflow ethicflow > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260101.sql | docker compose exec -T db psql -U ethicflow ethicflow

# Backup uploads
tar czf uploads_$(date +%Y%m%d).tar.gz uploads/
```

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
| Name | EthicFlow Mail |
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

> When a meeting is created in EthicFlow, it will appear in the organizer's Outlook calendar and send invites to all attendees.
> If the Graph API call fails, meeting creation still succeeds (graceful degradation).

---

### 3. Microsoft SSO / Entra ID

**Create a new App registration:**

| Setting | Value |
|---------|-------|
| Name | EthicFlow SSO |
| Supported account types | Single tenant (or multi-tenant) |
| Redirect URI | `https://yourdomain.com/api/auth/microsoft/callback` |

**Authentication:**
- Platform: Web
- Redirect URI: `https://yourdomain.com/api/auth/microsoft/callback`
- Front-channel logout URL: (optional)
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
4. Backend exchanges code → gets user profile → creates/finds user → returns JWT
5. User redirected to `/sso-callback?token=...` → stored in memory → to dashboard

**First-time SSO users:** Created automatically as `RESEARCHER` role. Admin can promote via Users page.

**Email conflict:** If the email already exists with local password auth, the user sees a Hebrew error and is asked to use email/password instead.
