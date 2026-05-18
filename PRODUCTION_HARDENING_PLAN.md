# PRODUCTION_HARDENING_PLAN

## Scope

This plan focuses only on:

1. JWT hardening with short access tokens and refresh token rotation
2. Notification reliability and abuse protection
3. Automated database backups
4. Sentry backend monitoring
5. Firebase Crashlytics for customer and merchant apps
6. Safe refactor of large backend files
7. Security cleanup for secrets and docs
8. Rate limiting for OTP, login, and admin notifications

## Explicit non-goals

- Do not deploy production during this phase
- Do not change Odoo sync logic without separate review
- Do not change checkout/order creation logic without separate review
- Do not redesign mobile UI
- Do not change API response shapes unless absolutely necessary and reviewed

---

## 1. JWT hardening with short access tokens and refresh token rotation

### Objective

Reduce token replay risk, support secure session renewal, and prepare mobile apps for safer long-lived sessions.

### Current concerns

- Legacy long-lived access tokens increase replay window if stolen
- Refresh flow exists in parts of the backend history, but production hardening needs final review and enforcement
- Logout / revoke / rotate behavior must be consistent across admin, merchant, and customer flows

### Files likely affected

- `backend/src/routes/auth.js`
- `backend/src/utils/auth.js`
- `backend/src/middleware/auth.js`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js` if seed assumptions need cleanup
- `backend/README.md`
- `PROJECT_STATUS.md`
- Mobile app token storage / refresh integration later if needed:
  - `apps/customer_app/lib/main.dart`
  - `apps/merchant_app/lib/main.dart`

### Implementation steps

1. Review current access token TTL and refresh token TTL behavior in `src/utils/auth.js`
2. Set access token expiry target to 15 minutes behind a compatibility flag
3. Keep refresh token rotation mandatory on refresh
4. Ensure refresh tokens are hashed in DB, never stored plaintext
5. Ensure every refresh invalidates the previous refresh token
6. Ensure logout revokes current refresh token
7. Ensure logout-all-devices revokes all user refresh tokens
8. Ensure admin, merchant, and customer all use the same hardened token lifecycle
9. Add explicit env/config flag for transition from legacy long-lived access tokens
10. Document migration path for mobile apps before enforcing short TTL everywhere

### Risks

- Existing mobile apps may not handle short token expiry if refresh flow is incomplete client-side
- Breaking refresh behavior may lock out admins or merchants if rollout is abrupt
- Revocation bugs can create session churn or false logouts

### Testing plan

- Unit / route-level tests for:
  - login returns access + refresh tokens
  - refresh rotates token
  - reused old refresh token is rejected
  - logout revokes current token
  - logout-all revokes all sessions
- Manual staging tests:
  - customer login
  - merchant login
  - admin login
  - token refresh after expiry
  - logout and retry refresh

---

## 2. Notification reliability and abuse protection

### Objective

Make admin/customer/merchant notifications durable, observable, and resistant to abuse or accidental mass-send mistakes.

### Current concerns

- Admin notification system now exists, but reliability and abuse limits should be tightened
- Token health cleanup and invalid-token handling may still need improvement
- Broadcast actions need admin-side limits and audit visibility

### Files likely affected

- `backend/src/services/notifications.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/auth.js`
- `backend/src/middleware/rateLimiter.js`
- `backend/prisma/schema.prisma`
- `backend/admin.html`
- `apps/customer_app/lib/main.dart`
- `apps/merchant_app/lib/main.dart`
- `ADMIN_NOTIFICATIONS_REVIEW.md`

### Implementation steps

1. Add rate limiting specifically for:
   - `POST /admin/notifications/customers`
   - `POST /admin/notifications/merchants`
2. Add tighter admin permission checks for broadcast actions
3. Add dry-run or preview-only mode for staging/testing if needed
4. Detect invalid/unregistered FCM tokens and mark/remove them safely
5. Record per-send metadata:
   - total tokens targeted
   - success count
   - failure count
   - request ID
   - sender admin ID
6. Add guardrails for repeated identical sends in a short time window
7. Add stronger payload validation for image/action URLs
8. Add backend logging around FCM response failures
9. Document one-device test procedure vs full broadcast procedure

### Risks

- Over-aggressive token cleanup may remove valid tokens after transient Firebase errors
- Weak rate limits could allow mass spam or admin mistakes
- Strong rate limits without exemptions could block legitimate staged tests

### Testing plan

- Staging tests:
  - send one customer notification
  - send one merchant notification
  - verify history entry created
  - verify unauthorized user gets 401/403
  - verify repeated rapid sends trigger limit
- Token failure simulation:
  - inject invalid token
  - verify failure counted without crashing route

---

## 3. Automated database backups

### Objective

Ensure production data can be restored after accidental deletion, schema regression, or infrastructure incident.

### Current concerns

- Backups may currently be manual or outside documented process
- No guaranteed restore test path documented in-project

### Files likely affected

- `backend/README.md`
- `backend/WENZLA_PROJECT_DOCS.md`
- `PROJECT_STATUS.md`
- New docs file if desired later:
  - `BACKUP_RUNBOOK.md`

### Infrastructure likely affected

- Railway PostgreSQL backup policy
- External backup destination if Railway retention is insufficient
- Restore runbook

### Implementation steps

1. Confirm Railway automatic backup capability and retention
2. Define backup frequency:
   - daily automated snapshot minimum
   - weekly retained restore point
3. Define retention policy
4. Define ownership:
   - who verifies backups
   - who can restore
5. Add restore runbook
6. Perform one staging restore drill from backup copy if feasible
7. Record backup/restore process in docs

### Risks

- Assuming backups exist without restore validation is unsafe
- Same-account-only backups may not protect against account compromise
- Restore procedure may fail if not rehearsed

### Testing plan

- Verify backup schedule exists
- Verify restore instructions are complete
- Execute one non-production restore simulation if environment allows

---

## 4. Sentry backend monitoring

### Objective

Capture production backend exceptions, request context, and critical route failures early.

### Files likely affected

- `backend/package.json`
- `backend/src/server.js`
- `backend/src/utils/logger.js`
- Potential new file:
  - `backend/src/config/sentry.js`
- `backend/.env.example`
- `backend/README.md`

### Implementation steps

1. Add Sentry SDK dependency for Node/Express
2. Add isolated Sentry init file
3. Initialize Sentry early in `src/server.js`
4. Attach request context and user context where safe
5. Send unhandled exceptions and promise rejections
6. Tag environment, release, branch, and request ID
7. Avoid sending secrets or raw credentials
8. Document env vars:
   - `SENTRY_DSN`
   - `SENTRY_ENVIRONMENT`
   - `SENTRY_RELEASE`

### Risks

- Misconfigured Sentry may leak request bodies or secrets
- Too much noise if expected validation failures are reported as errors
- Missing source/release tags reduces usefulness

### Testing plan

- Trigger one controlled backend exception in staging
- Verify it appears in Sentry with request context
- Verify validation 4xx responses are not over-reported as server errors

---

## 5. Firebase Crashlytics for customer and merchant apps

### Objective

Capture production mobile crashes and major startup failures for both Flutter apps.

### Files likely affected

- `apps/customer_app/pubspec.yaml`
- `apps/customer_app/lib/main.dart`
- `apps/customer_app/android/app/build.gradle.kts`
- `apps/customer_app/android/settings.gradle.kts`
- `apps/merchant_app/pubspec.yaml`
- `apps/merchant_app/lib/main.dart`
- `apps/merchant_app/android/app/build.gradle.kts`
- `apps/merchant_app/android/settings.gradle.kts`
- `apps/customer_app/README.md`
- `apps/merchant_app/README.md`

### Implementation steps

1. Add Crashlytics packages to both apps
2. Initialize Firebase Crashlytics in app startup
3. Capture Flutter framework errors
4. Capture async zone errors
5. Add build-time setup for Crashlytics symbols if needed
6. Confirm merchant app Firebase config remains aligned with package name
7. Document required Firebase console setup

### Risks

- Missing Firebase app config breaks initialization
- Build-time plugin mismatch can break Android release build
- Crash reports can miss useful context if user/session tagging is absent

### Testing plan

- Run staging/dev build with Crashlytics enabled
- Trigger one controlled test crash in each app
- Confirm report appears in Firebase Console

---

## 6. Safe refactor of large backend files

### Objective

Reduce review risk and maintenance cost by splitting oversized files without changing behavior.

### High-priority large files

- `backend/src/routes/admin.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/customer.js`
- `backend/src/routes/merchant.js`
- `backend/src/services/odooOrderSync.js`

### Refactor strategy

Do this only as behavior-preserving extraction work after current hardening tasks are stable.

### Likely new structure

- `backend/src/routes/admin/`
  - `index.js`
  - `employees.js`
  - `notifications.js`
  - `orders.js`
  - `products.js`
  - `merchants.js`
- `backend/src/routes/auth/`
  - `index.js`
  - `customer.js`
  - `merchant.js`
  - `admin.js`
  - `tokens.js`
- `backend/src/services/odoo/`
  - `queue.js`
  - `statusSync.js`
  - `orderSync.js`
  - `partnerSync.js`
  - `monitoring.js`

### Risks

- Route extraction can accidentally change middleware order
- Auth extraction can break response shape or token flow
- Odoo queue refactor can change behavior if not covered carefully

### Testing plan

- Snapshot current route behavior before refactor
- Re-run `node --check`
- Re-run `prisma validate`
- Re-run targeted API smoke tests for:
  - auth
  - admin notifications
  - customer orders
  - merchant order status update
  - Odoo queue endpoints

---

## 7. Security cleanup for secrets and docs

### Objective

Remove credential leakage from docs, backup artifacts, demo defaults, and developer-facing files.

### Current concerns

- Historical docs contained keystore password references
- Review/backup packages may accidentally capture sensitive paths or config
- Demo/default credentials may still appear in app source or docs

### Files likely affected

- `WENZLA_PROJECT_DOCS.md`
- `backend/WENZLA_PROJECT_DOCS.md`
- `PROJECT_STATUS.md`
- backup generation docs/scripts if maintained
- `apps/merchant_app/lib/main.dart`
- any copied review docs mentioning secrets

### Implementation steps

1. Scan repository for:
   - passwords
   - keystore references
   - auth secrets
   - demo credentials
2. Replace real values with placeholders
3. Remove sensitive local paths where unnecessary
4. Ensure `.env.example` contains placeholders only
5. Review backup generation process for safe defaults
6. Add a “sensitive data checklist” for future exports

### Risks

- Missing one leaked value in docs defeats the cleanup goal
- Over-sanitizing could remove necessary setup clarity

### Testing plan

- Run repository-wide secret grep
- Manually inspect exported docs/backups
- Confirm safe backup package excludes sensitive files

---

## 8. Rate limiting for OTP, login, and admin notifications

### Objective

Reduce brute force, spam, and admin abuse risks while preserving legitimate use.

### Files likely affected

- `backend/src/middleware/rateLimiter.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/admin.js`
- `backend/README.md`
- `PROJECT_STATUS.md`

### Implementation steps

1. Review existing auth limiter coverage
2. Separate rate policies by route sensitivity:
   - OTP request
   - OTP verify
   - admin login
   - merchant login
   - refresh token endpoint
   - admin notifications
3. Add per-IP rate limits
4. Add optional per-user/per-phone throttling where safe
5. Use safe generic error messages
6. Log repeated abuse patterns without exposing secrets
7. Document expected retry windows

### Suggested targets

- OTP send:
  - strict per-IP + per-phone throttle
- OTP verify:
  - stricter attempt cap and backoff
- Admin login:
  - very strict limiter
- Notification send:
  - low-frequency limiter to prevent rapid mass sends

### Risks

- Too strict limits may block legitimate users
- Too weak limits leave brute force window open
- Per-phone throttling must not leak whether a user exists

### Testing plan

- Repeated OTP send attempts
- Repeated OTP verify attempts with wrong code
- Repeated bad admin login attempts
- Repeated admin broadcast send attempts
- Confirm correct 429 behavior and recovery after window expires

---

## Recommended implementation order

1. Secrets/docs cleanup
2. Rate limiting hardening
3. JWT + refresh token hardening
4. Sentry backend monitoring
5. Crashlytics for mobile apps
6. Notification reliability / token cleanup / abuse protection
7. Automated backup runbook and restore validation
8. Large-file refactor after behavior is stable

---

## Cross-cutting risks

- Production-safe changes in auth may still break mobile clients if staged rollout is skipped
- Monitoring tools can leak sensitive request data if not filtered
- Refactor work can accidentally alter middleware order
- Backup confidence is false confidence unless restore is tested

---

## Minimum acceptance criteria before production rollout

### Auth
- short access token path implemented
- refresh token rotation verified
- logout / revoke verified

### Notifications
- admin notification endpoints rate-limited
- broadcast history visible
- token cleanup policy documented

### Monitoring
- backend exceptions visible in Sentry
- both Flutter apps report crashes to Crashlytics

### Backup
- automatic DB backups confirmed
- restore runbook written

### Security hygiene
- docs and backup artifacts scanned for secrets

### Refactor readiness
- large file split plan approved before execution

---

## Final note

This plan intentionally avoids changing:

- Odoo synchronization behavior
- checkout/order transaction behavior

unless those changes are separately reviewed and approved.