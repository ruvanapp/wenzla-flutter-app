# PROJECT_STATUS

## Current task
- Admin dashboard notifications feature
- Backend review formatting cleanup
- Monitoring and backup safety hardening

## Branch status
- Backend git branch created: `admin-notifications`
- Deployed to Railway **staging only** for verification
- Not pushed to main
- Not deployed to production
- Note: `admin-dashboard` and Flutter app folders are outside the backend git repo in this workspace

## Files changed

### Backend
- `backend/prisma/schema.prisma`
- `backend/src/services/notifications.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/admin.js`
- `backend/admin.html`

### Merchant app
- `apps/merchant_app/pubspec.yaml`
- `apps/merchant_app/android/settings.gradle.kts`
- `apps/merchant_app/android/app/build.gradle.kts`
- `apps/merchant_app/android/app/src/main/AndroidManifest.xml`
- `apps/merchant_app/android/app/google-services.json`
- `apps/merchant_app/lib/main.dart`

### Review file
- `ADMIN_NOTIFICATIONS_REVIEW.md`

## Endpoints added
- `POST /admin/notifications/customers`
- `POST /admin/notifications/merchants`
- `GET /admin/notifications/history`
- `PATCH /auth/merchant/fcm-token`

## Database additions
- `DeviceToken`
- `NotificationHistory`

## Validation status
- Backend syntax checks ✅
- Prisma schema validation ✅
- Merchant app analyze ✅
- Merchant app debug APK build ✅
- Customer app analyze ✅ with 1 old non-blocking info lint

## Backend formatting cleanup
- Formatted files:
  - `backend/src/server.js`
  - `backend/src/routes/admin.js`
  - `backend/src/routes/auth.js`
  - `backend/src/routes/customer.js`
  - `backend/src/routes/merchant.js`
  - `backend/src/services/notifications.js`
  - `backend/src/services/odooOrderSync.js`
  - `backend/prisma/schema.prisma`
- Validation after formatting:
  - `node --check` on all changed JS files ✅
  - `prisma validate` ✅
- Logic changes: none intended; formatting cleanup only

## Final release APK build status
- Customer release ARM64 build ✅ succeeded
- Merchant release ARM64 build ✅ succeeded
- Release signing keystore used:
  - `/Users/ahmedmohamedomer/Desktop/wenzla-keys/wenzla-release.keystore`
- Both apps used signing config from:
  - `apps/customer_app/android/key.properties`
  - `apps/merchant_app/android/key.properties`
- Current configured signing values:
  - `keyAlias=wenzla`
  - `storeFile=/Users/ahmedmohamedomer/Desktop/wenzla-keys/wenzla-release.keystore`

## Requested final APK output
- Target folder: `/Users/ahmedmohamedomer/Desktop/wenzla-final-apks`
- Target filenames:
  - `wenzla-customer-arm64-release.apk`
  - `wenzla-merchant-arm64-release.apk`
- Status: generated successfully
- Customer APK path:
  - `/Users/ahmedmohamedomer/Desktop/wenzla-final-apks/wenzla-customer-arm64-release.apk`
- Customer APK size:
  - `18,745,633 bytes`
- Merchant APK path:
  - `/Users/ahmedmohamedomer/Desktop/wenzla-final-apks/wenzla-merchant-arm64-release.apk`
- Merchant APK size:
  - `17,374,285 bytes`
- Both APKs are RELEASE builds ✅

## Staging deployment result
- Staging deploy succeeded ✅
- Deployment ID: `80e885d7-7a40-484a-9dfe-22545f924095`
- Staging URL: `https://wenzla-backend-staging.up.railway.app/dashboard`
- Notifications tab visible in staging HTML ✅
- Admin notification API unauthorized access returns `401 Authentication required` ✅
- Admin login on staging works ✅
- Dashboard now uses `window.location.origin` on staging ✅
- Notifications tab visible ✅
- `Send to Customers` tab visible ✅
- `Send to Merchants` tab visible ✅

## Staging login fix result
- Exact cause: `backend/admin.html` was hardcoded to `https://wenzla-backend-production.up.railway.app`
- Exact fix: changed dashboard API base to `window.location.origin`
- Staging dashboard is now isolated from production for login/API calls ✅

## Runtime test status
- Customer push runtime test: pending manual/runtime verification
- Merchant push runtime test: Firebase config added locally, pending real merchant device verification
- Broadcast staging test: ready after manual admin send verification

## Safety confirmation
- Odoo unchanged
- Checkout/order creation logic unchanged
- OTP auth logic unchanged except token attachment support reuse
- Production not deployed
- Main branch not merged
