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
