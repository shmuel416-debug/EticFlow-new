/**
 * @file Extended Test Day runner for live Production API smoke + RBAC.
 * Executes baseline, role-based flows, RBAC negative checks, regression smoke,
 * and writes a structured JSON report to stdout.
 */

const BASE = process.env.TEST_BASE_URL || 'https://frontend-eticflow-dev.up.railway.app';
const USERS = [
  { role: 'RESEARCHER', email: 'researcher@test.com', password: '123456' },
  { role: 'SECRETARY',  email: 'secretary@test.com',  password: '123456' },
  { role: 'REVIEWER',   email: 'reviewer@test.com',   password: '123456' },
  { role: 'CHAIRMAN',   email: 'chairman@test.com',   password: '123456' },
  { role: 'ADMIN',      email: 'admin@test.com',      password: '123456' },
];

const results = { baseline: {}, roles: {}, rbac: [], cross: {}, regression: {} };

/**
 * Fetch helper that returns status + parsed body.
 * @param {string} path - API path.
 * @param {object} [opts] - fetch options incl. token.
 * @returns {Promise<{status:number, body:any}>}
 */
async function call(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

/**
 * Log a line and capture into report.
 * @param {string} msg - Text to log.
 */
function log(msg) { console.log(msg); }

/**
 * Step 1 - Baseline availability.
 */
async function baseline() {
  log('=== STEP 1: BASELINE ===');
  const fe = await fetch(BASE).then(r => r.status).catch(() => 0);
  const api = await call('/api/health');
  results.baseline.frontend = fe === 200 ? 'PASS' : `FAIL (${fe})`;
  results.baseline.apiHealth = api.status === 200 && api.body?.database === 'connected' ? 'PASS' : `FAIL (${api.status})`;
  log(`Frontend: ${results.baseline.frontend}`);
  log(`API Health: ${results.baseline.apiHealth} - ${JSON.stringify(api.body)}`);
}

/**
 * Step 2 - Login all roles and store tokens.
 * @returns {Promise<Record<string,string>>}
 */
async function loginAll() {
  log('\n=== STEP 2: LOGIN ALL 5 ROLES ===');
  const tokens = {};
  for (const u of USERS) {
    const r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: u.email, password: u.password }) });
    const ok = r.status === 200 && r.body?.token;
    results.roles[u.role] = { login: ok ? 'PASS' : `FAIL (${r.status})` };
    if (ok) tokens[u.role] = r.body.token;
    log(`${u.role}: ${results.roles[u.role].login}`);
  }
  return tokens;
}

/**
 * Step 3 - Researcher flow.
 * @param {string} token - JWT.
 */
async function researcherFlow(token) {
  log('\n=== STEP 3: RESEARCHER FLOW ===');
  const f = results.roles.RESEARCHER;
  const me = await call('/api/auth/me', { token });
  f.me = me.status === 200 ? 'PASS' : `FAIL (${me.status})`;
  const subs = await call('/api/submissions', { token });
  f.mySubmissions = subs.status === 200 ? 'PASS' : `FAIL (${subs.status})`;
  const notif = await call('/api/notifications', { token });
  f.notifications = notif.status === 200 ? 'PASS' : `FAIL (${notif.status})`;
  const forbiddenReports = await call('/api/reports/stats', { token });
  f.forbiddenReports = forbiddenReports.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenReports.status})`;
  const forbiddenUsers = await call('/api/users/admin/users', { token });
  f.forbiddenUsers = forbiddenUsers.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenUsers.status})`;
  const forbiddenAudit = await call('/api/audit-logs', { token });
  f.forbiddenAudit = forbiddenAudit.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenAudit.status})`;
  log(JSON.stringify(f, null, 2));
}

/**
 * Step 4 - Secretary flow.
 * @param {string} token - JWT.
 */
async function secretaryFlow(token) {
  log('\n=== STEP 4: SECRETARY FLOW ===');
  const f = results.roles.SECRETARY;
  const me = await call('/api/auth/me', { token });
  f.me = me.status === 200 ? 'PASS' : `FAIL (${me.status})`;
  const dash = await call('/api/submissions/dashboard/secretary', { token });
  f.dashboard = dash.status === 200 ? 'PASS' : `FAIL (${dash.status})`;
  const subs = await call('/api/submissions?page=1&limit=10', { token });
  f.submissionsPaged = subs.status === 200 ? 'PASS' : `FAIL (${subs.status})`;
  const reviewers = await call('/api/users/reviewers', { token });
  f.reviewers = reviewers.status === 200 ? 'PASS' : `FAIL (${reviewers.status})`;
  const meetings = await call('/api/meetings', { token });
  f.meetings = meetings.status === 200 ? 'PASS' : `FAIL (${meetings.status})`;
  const forbiddenUsers = await call('/api/users/admin/users', { token });
  f.forbiddenAdminUsers = forbiddenUsers.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenUsers.status})`;
  log(JSON.stringify(f, null, 2));
}

/**
 * Step 5 - Reviewer flow.
 * @param {string} token - JWT.
 */
async function reviewerFlow(token) {
  log('\n=== STEP 5: REVIEWER FLOW ===');
  const f = results.roles.REVIEWER;
  const me = await call('/api/auth/me', { token });
  f.me = me.status === 200 ? 'PASS' : `FAIL (${me.status})`;
  const assignments = await call('/api/submissions', { token });
  f.assignments = assignments.status === 200 ? 'PASS' : `FAIL (${assignments.status})`;
  const forbiddenDashboard = await call('/api/submissions/dashboard/secretary', { token });
  f.forbiddenSecretaryDashboard = forbiddenDashboard.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenDashboard.status})`;
  const forbiddenAudit = await call('/api/audit-logs', { token });
  f.forbiddenAudit = forbiddenAudit.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenAudit.status})`;
  log(JSON.stringify(f, null, 2));
}

/**
 * Step 6 - Chairman flow.
 * @param {string} token - JWT.
 */
async function chairmanFlow(token) {
  log('\n=== STEP 6: CHAIRMAN FLOW ===');
  const f = results.roles.CHAIRMAN;
  const me = await call('/api/auth/me', { token });
  f.me = me.status === 200 ? 'PASS' : `FAIL (${me.status})`;
  const queue = await call('/api/submissions', { token });
  f.queue = queue.status === 200 ? 'PASS' : `FAIL (${queue.status})`;
  const reports = await call('/api/reports/stats', { token });
  f.reports = reports.status === 200 ? 'PASS' : `FAIL (${reports.status})`;
  const protocols = await call('/api/protocols', { token });
  f.protocols = protocols.status === 200 ? 'PASS' : `FAIL (${protocols.status})`;
  const forbiddenUsersAdmin = await call('/api/users/admin/users', { token });
  f.forbiddenAdminUsers = forbiddenUsersAdmin.status === 403 ? 'PASS (blocked)' : `FAIL (got ${forbiddenUsersAdmin.status})`;
  log(JSON.stringify(f, null, 2));
}

/**
 * Step 7 - Admin flow.
 * @param {string} token - JWT.
 */
async function adminFlow(token) {
  log('\n=== STEP 7: ADMIN FLOW ===');
  const f = results.roles.ADMIN;
  const me = await call('/api/auth/me', { token });
  f.me = me.status === 200 ? 'PASS' : `FAIL (${me.status})`;
  const users = await call('/api/users/admin/users?page=1&limit=10', { token });
  f.users = users.status === 200 ? 'PASS' : `FAIL (${users.status})`;
  const audit = await call('/api/audit-logs?page=1&limit=10', { token });
  f.audit = audit.status === 200 ? 'PASS' : `FAIL (${audit.status})`;
  const reports = await call('/api/reports/stats', { token });
  f.reports = reports.status === 200 ? 'PASS' : `FAIL (${reports.status})`;
  const dash = await call('/api/submissions/dashboard/secretary', { token });
  f.secretaryDashboardAccess = dash.status === 200 ? 'PASS' : `FAIL (${dash.status})`;
  log(JSON.stringify(f, null, 2));
}

/**
 * Step 8 - Cross-system checks (no-auth/error handling).
 */
async function crossSystemChecks() {
  log('\n=== STEP 8: CROSS-SYSTEM ===');
  const noAuth = await call('/api/submissions');
  results.cross.requiresAuth = noAuth.status === 401 ? 'PASS' : `FAIL (got ${noAuth.status})`;
  const badLogin = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'nope@x.com', password: 'wrong' }) });
  results.cross.badLoginRejected = [400, 401, 403].includes(badLogin.status) ? 'PASS' : `FAIL (got ${badLogin.status})`;
  const notFound = await call('/api/does-not-exist');
  results.cross.notFoundHandled = notFound.status === 404 ? 'PASS' : `FAIL (got ${notFound.status})`;
  log(JSON.stringify(results.cross, null, 2));
}

/**
 * Step 9 - Regression: re-login + /me for all roles.
 */
async function regression() {
  log('\n=== STEP 9: REGRESSION SMOKE ===');
  for (const u of USERS) {
    const r = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: u.email, password: u.password }) });
    const ok = r.status === 200 && r.body?.token;
    if (!ok) { results.regression[u.role] = `FAIL login (${r.status})`; continue; }
    const me = await call('/api/auth/me', { token: r.body.token });
    results.regression[u.role] = me.status === 200 ? 'PASS' : `FAIL me (${me.status})`;
  }
  log(JSON.stringify(results.regression, null, 2));
}

/**
 * Main runner entry point.
 */
async function main() {
  const started = Date.now();
  await baseline();
  const tokens = await loginAll();
  if (tokens.RESEARCHER) await researcherFlow(tokens.RESEARCHER);
  if (tokens.SECRETARY)  await secretaryFlow(tokens.SECRETARY);
  if (tokens.REVIEWER)   await reviewerFlow(tokens.REVIEWER);
  if (tokens.CHAIRMAN)   await chairmanFlow(tokens.CHAIRMAN);
  if (tokens.ADMIN)      await adminFlow(tokens.ADMIN);
  await crossSystemChecks();
  await regression();
  const elapsedMs = Date.now() - started;
  log('\n=== FINAL REPORT ===');
  console.log(JSON.stringify({ ...results, elapsedMs }, null, 2));
}

main().catch(err => { console.error('RUNNER ERROR:', err); process.exit(1); });
