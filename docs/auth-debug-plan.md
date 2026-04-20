# 🔍 Authentication Debug Plan — Login Form Not Submitting

**Status:** CRITICAL — Blocks all E2E testing  
**Date:** 2026-04-19  
**Symptom:** Form fills but submit button does nothing (3+ second hang, no error message)

---

## Root Cause Analysis

### Problem 1: Frontend API URL Not Configured for Production
- **Frontend baseURL:** `'/api'` (relative URL in `frontend/src/services/api.js`)
- **Dev behavior:** Vite proxy handles it → `localhost:5173/api` → proxies to `localhost:5000`
- **Prod behavior:** Browser tries `https://frontend-eticflow-dev.up.railway.app/api` → no backend there
- **Result:** API call fails silently or with CORS error not visible in UI

### Problem 2: Backend CORS Configuration Requires FRONTEND_URL Environment Variable
- **Backend CORS check** (line 40-42 of `backend/src/index.js`):
  ```javascript
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  ```
- **If FRONTEND_URL not set in production:** CORS blocks the request
- **Frontend doesn't show CORS error:** axios error normalization hides it

---

## Step-by-Step Investigation

### Phase 1: Verify Frontend Configuration
1. ✅ Check if frontend has environment variable for API URL
2. ✅ Verify axios baseURL can be configured at runtime
3. ✅ Check if frontend is accessing the correct backend domain

### Phase 2: Verify Backend Configuration (Production)
1. Check if backend is deployed on Railway
2. Verify FRONTEND_URL environment variable is set correctly
3. Verify CORS origin matches frontend URL

### Phase 3: Test API Connectivity
1. From browser console: check Network tab for POST /api/auth/login
2. Verify request is actually being sent (not blocked before)
3. Check response status and headers

---

## Solution

### For Frontend: Add API_URL Support
**File:** `frontend/src/services/api.js`

Change from:
```javascript
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})
```

To support environment variable:
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
})
```

Then set environment variable in production:
- Create `.env.production` in frontend: `VITE_API_URL=https://backend-api-domain.com/api`
- Or set in Railway deployment config

### For Backend: Verify FRONTEND_URL is Set
Ensure Railway backend has environment variables:
```
NODE_ENV=production
FRONTEND_URL=https://frontend-eticflow-dev.up.railway.app
```

---

## How to Test the Fix

1. **Verify API connection:**
   ```bash
   curl -X POST https://<backend-domain>/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"researcher@test.com","password":"123456"}'
   ```

2. **Check frontend logs:**
   - Open browser DevTools → Console
   - Check for errors or warnings
   - Look for "API request to /api/auth/login"

3. **Monitor Network tab:**
   - Open Network tab
   - Attempt login
   - Check if POST /api/auth/login request is sent
   - Check response status and body

4. **Test form submission:**
   - Fill email: `researcher@test.com`
   - Fill password: `123456`
   - Click "כניסה למערכת"
   - Should redirect to dashboard
   - Or show error message in Hebrew

---

## Quick Fix Checklist

- [ ] Verify backend is running (curl /api/health)
- [ ] Verify FRONTEND_URL environment variable on backend
- [ ] Add VITE_API_URL support to frontend axios config
- [ ] Set VITE_API_URL in frontend environment (development: `/api`, production: `https://backend-domain.com/api`)
- [ ] Test login on both localhost and production
- [ ] Check Network tab for successful POST request
- [ ] Verify token is received and stored in memory
- [ ] Test navigation to dashboard after login
- [ ] Test redirect to login on unauthorized requests

---

## Related Issues

- **Token persistence broken:** Likely same auth system issue
- **Meetings page redirect:** Likely auth state not being set correctly
- **E2E testing blocked:** All depends on login working

---

**Investigation Note:** The form code and backend endpoints are correct. The issue is **configuration/connectivity** between frontend and backend in the production environment.
