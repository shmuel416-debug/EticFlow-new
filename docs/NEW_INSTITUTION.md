# EthicFlow — New Institution Setup Guide

## Overview
EthicFlow is a standalone product. Each institution gets its own deployment with customized branding and settings. This guide explains how to deploy for a new client.

## What's Customizable Per Institution

| Setting | Where | Example |
|---------|-------|---------|
| Name (he+en) | .env | "מכון לב" / "JCT" |
| Logo | /public/logos/ | jct.png |
| Brand color | .env | #1e3a8a |
| Domain | .env | ethics.jct.ac.il |
| Language default | .env | he |
| Academic year start | .env | 10 (October) |
| Email templates | Admin UI | Custom text per institution |
| Form fields | Secretary UI | Custom forms via Form Builder |
| SLA targets | Secretary UI | Custom days per stage |
| Holidays | Secretary UI | Custom holiday table |
| Auth method | .env | local / microsoft / google |

## Deployment Steps

### 1. Server Setup (5 min)
```bash
# On the institution's server:
git clone https://github.com/shmuel416-debug/EthicFlow.git
cd EthicFlow
chmod +x setup.sh
./setup.sh
```
The wizard will ask for: institution name, domain, DB password, admin email, email provider.

### 2. Branding (5 min)
- Place institution logo in `frontend/public/logos/`
- Update .env: INSTITUTION_NAME_HE, INSTITUTION_NAME_EN, INSTITUTION_PRIMARY_COLOR
- Rebuild frontend: `docker compose build frontend`

### 3. SSL Certificate (10 min)
```bash
# Option A: Let's Encrypt (free)
certbot certonly --standalone -d ethics.institution.ac.il
cp /etc/letsencrypt/live/ethics.institution.ac.il/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/ethics.institution.ac.il/privkey.pem nginx/ssl/

# Option B: Institution's existing certificate
# Copy .pem files to nginx/ssl/
```

### 4. Email Setup (5 min)
Update .env with institution's SMTP:
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.institution.ac.il
SMTP_PORT=587
SMTP_USER=ethics@institution.ac.il
SMTP_PASSWORD=xxxxx
SMTP_FROM=ethics@institution.ac.il
```

### 5. First Login & Configure (15 min)
1. Login as admin
2. **Settings page**: verify institution details
3. **Users page**: add secretary, committee members
4. **Form Builder**: create first submission form (or import template)
5. **SLA Settings**: adjust business days + add institution holidays
6. **Email Templates**: customize email text if needed

### 6. SSO Setup (Optional — Phase 2)
```
# For Microsoft Entra ID:
AUTH_PROVIDER=microsoft
MICROSOFT_AUTH_CLIENT_ID=xxx
MICROSOFT_AUTH_CLIENT_SECRET=xxx
MICROSOFT_AUTH_TENANT_ID=xxx
```
Register the app in Azure Portal → set redirect URI → update .env.

## Data Architecture

### Seed Data (comes with the system)
- Default roles (5): Researcher, Secretary, Reviewer, Chairman, Admin
- Default SLA values: Triage 3d, Review 14d, Revision 30d, Approval 5d
- Sample form template (can be imported)
- System enum values

### Institution Data (entered by each institution)
- Users (researchers, committee members)
- Forms (built via Form Builder)
- Submissions (from researchers)
- Meetings, protocols, documents
- Holiday table
- Email templates (customized text)

### Migration Strategy
- All DB changes via Prisma Migrate
- New institution: `npx prisma migrate deploy` runs all migrations from zero
- Existing institution: `npx prisma migrate deploy` runs only new migrations
- Rollback: `npx prisma migrate resolve`

## Support & Maintenance

### Monitoring
```bash
# Health check
curl https://domain/api/health

# Container status
docker compose ps

# Logs
docker compose logs -f --tail=100

# DB connections
docker compose exec db psql -U ethicflow -c "SELECT count(*) FROM pg_stat_activity;"
```

### Common Issues
| Issue | Solution |
|-------|----------|
| Login fails after SSO setup | Check MICROSOFT_AUTH_REDIRECT_URI matches exactly |
| Emails not sending | Test SMTP: `docker compose exec backend node -e "require('./src/services/email.service').getEmailService().send({to:'test@test.com',subject:'test',html:'test'})"` |
| File upload fails | Check UPLOAD_MAX_SIZE_MB and disk space |
| SLA not updating | Check cron job: `docker compose exec backend node src/jobs/sla-checker.js` |
