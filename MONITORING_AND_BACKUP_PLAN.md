# MONITORING_AND_BACKUP_PLAN

## Scope

This step covers only:

1. Backend crash/error monitoring
2. Mobile crash monitoring
3. Automated database backup strategy
4. Backup verification documentation
5. Production-safe observability

## Explicit non-goals

- No production deployment
- No main merge
- No checkout logic changes
- No Odoo logic changes
- No notification behavior changes
- No authentication flow changes
- No destructive cleanup jobs
- No secret rotation in this phase

---

## Current branch

- `admin-notifications`

---

## Planned changes

### Backend monitoring
- Add Sentry Node SDK integration
- Capture unhandled exceptions and request-scoped backend errors
- Add environment-aware initialization
- Attach request IDs and safe structured metadata

### Mobile crash monitoring
- Add Firebase Crashlytics to:
  - `apps/customer_app`
  - `apps/merchant_app`
- Capture:
  - Flutter framework errors
  - async zone errors
  - fatal startup/runtime crashes

### Logging / observability
- Keep JSON structured logging
- Improve staging-safe observability by:
  - attaching release/environment tags
  - documenting Railway log usage
  - ensuring request IDs are visible in logs and Sentry

### Backups
- Add a non-destructive backup strategy document only
- Add restore/recovery runbook
- Add retention policy
- Add verification checklist
- No auto-delete or destructive backup scripts

---

## Files expected to be modified

### Backend
- `backend/package.json`
- `backend/.env.example`
- `backend/src/server.js`
- `backend/src/utils/logger.js`
- `backend/README.md`

### Backend new files
- `backend/src/config/sentry.js`
- `backend/BACKUP_AND_RESTORE_RUNBOOK.md`
- `backend/OBSERVABILITY_RUNBOOK.md`

### Customer app
- `apps/customer_app/pubspec.yaml`
- `apps/customer_app/lib/main.dart`
- `apps/customer_app/android/app/build.gradle.kts`

### Merchant app
- `apps/merchant_app/pubspec.yaml`
- `apps/merchant_app/lib/main.dart`
- `apps/merchant_app/android/app/build.gradle.kts`

### Status / review docs
- `PROJECT_STATUS.md`
- `ADMIN_NOTIFICATIONS_REVIEW.md` if staging validation is affected

---

## Why each modification is needed

### `backend/package.json`
- add Sentry dependency for backend crash reporting

### `backend/.env.example`
- document all monitoring variables clearly without exposing secrets

### `backend/src/server.js`
- initialize Sentry early
- attach request handlers / error middleware safely
- preserve existing route behavior

### `backend/src/utils/logger.js`
- optionally enrich structured logs with environment/release tags
- keep logs Railway-safe and JSON-based

### `backend/src/config/sentry.js`
- isolate monitoring setup from business logic
- avoid cluttering `server.js`

### `backend/README.md`
- document Sentry setup
- document Railway logging usage
- document backup process

### `apps/customer_app/pubspec.yaml`
- add Crashlytics package(s)

### `apps/customer_app/lib/main.dart`
- initialize Crashlytics
- capture Flutter and async crashes

### `apps/customer_app/android/app/build.gradle.kts`
- enable Crashlytics Gradle plugin if required

### `apps/merchant_app/pubspec.yaml`
- add Crashlytics package(s)

### `apps/merchant_app/lib/main.dart`
- initialize Crashlytics
- capture Flutter and async crashes

### `apps/merchant_app/android/app/build.gradle.kts`
- enable Crashlytics Gradle plugin if required

### `backend/BACKUP_AND_RESTORE_RUNBOOK.md`
- define exact backup/restore procedures
- define verification steps

### `backend/OBSERVABILITY_RUNBOOK.md`
- define alerting, escalation, Railway log usage, and Sentry usage

---

## Exact Sentry setup steps

1. Create a Sentry project for the backend service
2. Copy the DSN into Railway staging first
3. Add env vars:
   - `SENTRY_DSN`
   - `SENTRY_ENVIRONMENT`
   - `SENTRY_RELEASE`
   - optional: `SENTRY_TRACES_SAMPLE_RATE`
4. Install Sentry SDK in backend
5. Initialize Sentry before routes mount
6. Add Express request + error handlers
7. Capture request ID, route, environment, and safe user identifiers
8. Do not send secrets, auth headers, OTP codes, or full request bodies
9. Trigger one staging test exception and verify it appears in Sentry

---

## Exact Crashlytics setup steps

### Firebase Console
1. Open Firebase Console
2. Ensure both Android apps are registered:
   - customer app package
   - merchant app package
3. Enable Crashlytics in the project
4. Confirm `google-services.json` is present for each app

### Flutter app setup
1. Add:
   - `firebase_crashlytics`
2. Initialize Firebase first
3. Register:
   - `FlutterError.onError`
   - `PlatformDispatcher.instance.onError`
4. Wrap startup in guarded zone for async crash capture
5. Build staging/release app
6. Trigger one controlled crash
7. Confirm report appears in Crashlytics dashboard

---

## Exact Railway logging setup

### Logging strategy
- Keep JSON logs from `src/utils/logger.js`
- Include:
  - `level`
  - `event`
  - `timestamp`
  - `requestId`
  - `environment`
  - `release`

### Operational usage
- Use Railway logs for:
  - request tracing
  - error correlation
  - deployment issue diagnosis
- Correlate request IDs between:
  - response headers
  - Railway logs
  - Sentry events

### Staging validation
- verify logs still print correctly
- verify request IDs remain visible
- verify no secret leakage appears in logs

---

## Exact backup strategy

### Backup source of truth
- Railway PostgreSQL remains primary data source

### Strategy
1. Use Railway database backup capability if available
2. Add independent periodic export recommendation
3. Keep at least:
   - daily backups
   - weekly retained snapshots
   - monthly retained long-term snapshot if feasible

### Backup frequency
- Daily automated snapshot
- Weekly checkpoint retention
- Monthly archive retention

### Backup ownership
- Owner/admin checks backup success weekly
- Restore procedure reviewed monthly

### No destructive automation
- No cleanup scripts that delete data
- No auto-prune scripts touching live DB

---

## Restore / recovery procedure

1. Identify incident scope
   - partial record corruption
   - full DB issue
   - accidental deletion
2. Freeze production changes
3. Select last known good backup
4. Restore to staging first
5. Validate:
   - auth records
   - merchants
   - products
   - orders
   - notification history
   - Odoo linkage fields
6. If restore is correct, schedule controlled production restore
7. Re-run smoke tests after restore
8. Record incident timeline and recovery actions

---

## Alerting / escalation flow

### Backend
- Critical:
  - server startup failure
  - repeated 500s
  - DB connection failure
  - auth endpoint crash
- High:
  - notification endpoint failure spikes
  - staging deployment crashes

### Mobile
- Critical:
  - startup crash spike
  - login crash spike
  - checkout crash spike

### Escalation
1. Detect via Railway logs / Sentry / Crashlytics
2. Confirm scope in staging or production-safe logs
3. Assign owner
4. Triage severity
5. Apply fix in branch
6. Validate on staging
7. Deploy only after review

---

## Backup retention policy

- Daily backups: retain 14 days minimum
- Weekly backups: retain 8 weeks minimum
- Monthly backups: retain 3–6 months minimum if cost allows
- Keep at least one restore-tested backup reference

---

## Staging validation plan

### Backend / Sentry
- Deploy to staging only
- Hit health endpoint
- trigger controlled backend exception route or safe test capture path
- verify Sentry receives event

### Mobile / Crashlytics
- Build staging-targeted app(s)
- Install on test device
- trigger controlled non-destructive crash
- verify Crashlytics receives event

### Logs
- confirm Railway logs remain readable
- confirm request IDs visible
- confirm no obvious secret leakage

### Backup docs
- verify runbook completeness
- verify no destructive automation added

---

## Risks

1. Sentry misconfiguration may leak request/body data if not scrubbed
2. Crashlytics plugin setup can break Android release builds if misconfigured
3. Too much monitoring noise can reduce usefulness
4. Backup strategy without restore practice creates false confidence
5. Environment variables may be added but not documented clearly

---

## Success criteria

- Backend errors visible in Sentry on staging
- Mobile crashes visible in Crashlytics on staging/test project
- Railway logs remain structured and readable
- Backup and restore runbook documented clearly
- No production deployment
- No changes to checkout, Odoo, auth flow, or notification business behavior
