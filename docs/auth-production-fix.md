# 🔧 Production Authentication Fix — Login Form Not Submitting

**Problem:** Frontend on Railway cannot reach backend API → login fails silently  
**Root Cause:** `VITE_API_URL` not configured for production environment  
**Solution:** Configure API URL for your specific deployment

---

## Quick Diagnosis

### Check 1: Verify Backend is Running
```bash
# Replace YOUR_BACKEND_URL with your actual backend domain
curl -X GET https://YOUR_BACKEND_URL/api/health

# Expected response:
# {"status":"ok","database":"connected"}
```

### Check 2: Test Login Endpoint
```bash
curl -X POST https://YOUR_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@test.com","password":"123456"}'

# Expected response:
# {
#   "user": {
#     "id": "...",
#     "email": "researcher@test.com",
#     "fullName": "...",
#     "role": "RESEARCHER"
#   },
#   "token": "eyJ..."
# }
```

If these fail, your backend is not accessible. Fix backend connectivity first.

---

## Solution 1: Railway Deployment (Most Likely)

### Scenario A: Both Frontend and Backend on Same Railway App

**Structure:**
```
Railway App "eticflow-app"
├── Frontend service (runs npm run build + serve)
├── Backend service (runs npm run start)
└── Database service (PostgreSQL)
```

**Configuration:**

1. **Backend environment variables:**
   ```
   NODE_ENV=production
   FRONTEND_URL=https://eticflow-app.railway.app
   API_PORT=5000
   ```

2. **Frontend environment variables:**
   ```
   VITE_API_URL=/api
   # (relative URL works because frontend serves from same domain)
   ```

3. **Railway configuration (Procfile or railway.toml):**
   ```yaml
   # railway.toml
   [build]
   builder = "nixpacks"

   [deploy]
   numReplicas = 1
   startCommand = "npm run start:all"  # Runs both frontend build + backend start
   ```

---

### Scenario B: Separate Railway Apps

**Structure:**
```
Railway App "eticflow-frontend"
└── Frontend only

Railway App "eticflow-backend"
└── Backend API + Database
```

**Configuration:**

1. **Backend app environment variables:**
   ```
   NODE_ENV=production
   FRONTEND_URL=https://eticflow-frontend.railway.app
   API_PORT=5000
   ```

2. **Frontend app environment variables:**
   ```
   VITE_API_URL=https://eticflow-backend.railway.app/api
   # (point to the separate backend domain)
   ```

3. **Deploy steps:**
   ```bash
   # Deploy backend first
   cd backend && npm run build  # if needed
   git push heroku main  # or railway deployment

   # Then deploy frontend
   cd frontend
   # Create .env.production with VITE_API_URL
   npm run build
   git push heroku main  # or railway deployment
   ```

---

## Solution 2: Docker Compose (Self-Hosted)

If running with docker-compose:

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:5173"  # or 443 for HTTPS
    environment:
      - VITE_API_URL=http://backend:5000/api  # Use internal Docker network
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=https://yourdomain.com
      - DATABASE_URL=postgresql://user:pass@db:5432/ethicflow
  
  db:
    image: postgres:16
    # ... postgres config
```

---

## Step-by-Step Fix for Railway

### Step 1: Determine Your Deployment Structure

Ask yourself:
- [ ] Is backend accessible at a different domain? (separate Railway app)
- [ ] Is backend on the same domain as frontend? (same Railway app)
- [ ] Is backend running locally while testing frontend on Railway?

### Step 2: Set Environment Variables

**For separate backends (different domains):**

In your **frontend Railway app** settings:
```
Environment Variables → Add Variable
Name: VITE_API_URL
Value: https://eticflow-backend.railway.app/api
```

**For same domain:**
```
Name: VITE_API_URL
Value: /api
```

Or leave it unset (defaults to `/api`)

### Step 3: Rebuild and Deploy Frontend

```bash
cd frontend

# Create .env.production if not using Railway env vars:
echo "VITE_API_URL=https://your-backend-domain.com/api" > .env.production

# Build
npm run build

# Deploy to Railway
git add .
git commit -m "fix: configure API URL for production"
git push railway main
```

### Step 4: Verify Backend CORS Configuration

In **backend Railway app** environment variables:
```
NODE_ENV=production
FRONTEND_URL=https://frontend-eticflow-dev.up.railway.app
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

The backend will use `FRONTEND_URL` to set CORS origin (line 40 of `backend/src/index.js`):
```javascript
cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true,
})
```

### Step 5: Test the Fix

1. Open frontend at `https://frontend-eticflow-dev.up.railway.app`
2. Open DevTools → Network tab
3. Fill login form:
   - Email: `researcher@test.com`
   - Password: `123456`
4. Click "כניסה למערכת"
5. Verify in Network tab: POST /api/auth/login request appears
6. Check response: Should see token in response
7. Page should redirect to dashboard

---

## Troubleshooting

### Symptom: "POST /api/auth/login" request doesn't appear in Network tab
**Cause:** Form not submitting or request blocked before sending  
**Fix:** Check browser console for JavaScript errors

### Symptom: "Network tab shows failed request (red X)"
**Cause:** CORS error or backend not responding  
**Fix:**
```bash
# Test backend directly
curl https://YOUR_BACKEND_DOMAIN/api/health
# Should return {"status":"ok",...}
```

### Symptom: "POST request succeeds (200) but no redirect"
**Cause:** Token not being stored or auth state not updating  
**Fix:** Check browser console - look for errors in AuthContext.login()

### Symptom: "CORS error in console"
**Cause:** Backend CORS origin doesn't match frontend URL  
**Fix:** Verify `FRONTEND_URL` environment variable on backend matches your frontend domain exactly

---

## Verification Checklist

- [ ] Backend is accessible: `curl https://YOUR_BACKEND/api/health`
- [ ] Backend CORS origin set: `FRONTEND_URL=https://YOUR_FRONTEND`
- [ ] Frontend API URL set: `VITE_API_URL=https://YOUR_BACKEND/api` (or `/api` if same domain)
- [ ] Frontend rebuilt and deployed after env var change
- [ ] Network tab shows POST request being sent
- [ ] Request returns 200 with token in response
- [ ] Token stored in memory (not localStorage)
- [ ] Page redirects to dashboard after login
- [ ] No CORS errors in console
- [ ] No JavaScript errors in console

---

## Code Changes Made

**File:** `frontend/src/services/api.js`
- Changed: `baseURL: '/api'`
- To: `baseURL: import.meta.env.VITE_API_URL || '/api'`
- Effect: Supports `VITE_API_URL` environment variable, defaults to `/api`

**New File:** `frontend/.env.example`
- Added template for environment configuration

---

## Next Steps After Fix

Once login is working:
1. ✅ Fix token persistence issue (related to auth state)
2. ✅ Fix /meetings page redirect
3. ✅ Run comprehensive E2E testing with all 5 roles
4. ✅ Generate final QA report
