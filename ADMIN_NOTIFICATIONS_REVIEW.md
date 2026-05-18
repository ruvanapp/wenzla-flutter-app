# ADMIN_NOTIFICATIONS_REVIEW

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

### Existing customer app status
- No new customer-app code changes were required for this feature.
- Customer app already registers FCM token after OTP login through `/auth/customer/fcm-token`.

## Endpoints added

### Admin-only notification endpoints
- `POST /admin/notifications/customers`
- `POST /admin/notifications/merchants`
- `GET /admin/notifications/history`

### Merchant FCM registration endpoint
- `PATCH /auth/merchant/fcm-token`

### Existing customer endpoint reused
- `PATCH /auth/customer/fcm-token`

## Payload shape

```json
{
  "title": "string",
  "message": "string",
  "imageUrl": "optional string",
  "actionUrl": "optional string"
}
```

## Database fields / tables added

### New table: `DeviceToken`
- stores one row per device token
- supports multiple devices per user
- fields:
  - `id`
  - `token` unique
  - `userId`
  - `role`
  - `platform`
  - `createdAt`
  - `updatedAt`

### New table: `NotificationHistory`
- stores admin notification broadcast history
- fields:
  - `id`
  - `title`
  - `message`
  - `audience`
  - `imageUrl`
  - `actionUrl`
  - `sentCount`
  - `failedCount`
  - `createdByAdminId`
  - `createdAt`

### User model additions
- `deviceTokens`
- `notificationHistory` relation for admin-created notifications

## Firebase config used

### Backend
Uses existing Firebase Admin config in:
- `backend/src/config/firebase.js`

Required env vars:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Customer app
Already configured with Firebase Messaging.
Confirmed existing file:
- `apps/customer_app/android/app/google-services.json`

### Merchant app
Merchant Firebase Android config is now present:
- `apps/merchant_app/android/app/google-services.json`

Package match confirmed:
- `com.example.wenzla_merchant_app`

## What was implemented

### 1. Admin dashboard UI
Implemented in the currently served dashboard file:
- `backend/admin.html`

Added:
- new **Notifications** tab
- sub-tabs:
  - Send to Customers
  - Send to Merchants
- title input
- message textarea
- optional image URL
- optional action URL / deep link
- preview card
- send button
- notification history list

### 2. Secure backend admin endpoints
Added admin-only notification routes in:
- `backend/src/routes/admin.js`

Security:
- still under `adminRouter.use(requireAuth(['ADMIN']))`
- added permission-level protection for `notifications`
- employee permission model expanded to include `notifications`

### 3. Broadcast FCM sending
Implemented in:
- `backend/src/services/notifications.js`

Added:
- `registerDeviceToken(...)`
- `sendBroadcastNotification(...)`
- multi-device token collection
- chunked sending with `sendEachForMulticast`
- deduping tokens across `User.fcmToken` and `DeviceToken`

### 4. Notification history logging
Stored in `NotificationHistory`

Includes:
- title
- message
- audience
- image URL
- action URL
- sent count
- failed count
- createdAt
- admin user who sent it

### 5. Merchant token registration
Added:
- `PATCH /auth/merchant/fcm-token`

Merchant app now:
- initializes Firebase
- requests notification permission
- gets FCM token after login
- sends token to backend

### 6. Customer token support
Customer app already had:
- token retrieval after OTP verify
- backend patch to `/auth/customer/fcm-token`

Backend now also stores customer tokens into the new `DeviceToken` table.

## Validation completed

### Backend validation
- `node --check src/routes/auth.js` ✅
- `node --check src/routes/admin.js` ✅
- `node --check src/services/notifications.js` ✅
- `prisma validate` ✅

### App validation
- `apps/merchant_app`: `flutter analyze` ✅
- `apps/merchant_app`: debug APK build ✅
- `apps/customer_app`: `flutter analyze` ✅ with 1 old non-blocking info lint only

## Staging deployment result

- Deployed to Railway staging only ✅
- Deployment ID: `80e885d7-7a40-484a-9dfe-22545f924095`
- Staging dashboard URL:
  - `https://wenzla-backend-staging.up.railway.app/dashboard`

### Verified on staging
- `/dashboard` loads successfully ✅
- Admin login works on staging ✅
- Notifications tab is visible in real staging HTML ✅
- `Send to Customers` tab exists ✅
- `Send to Merchants` tab exists ✅
- Notifications section HTML is present ✅
- Unauthenticated access to `GET /admin/notifications/history` returns `401 Authentication required` ✅

### Exact staging HTML evidence
- `<button data-tab="notifications" type="button">notifications</button>`
- `<section id="t-notifications" class="panel hidden">`
- `<div class="notification-shell">`
- `<button type="button" class="active" data-notification-tab="customers">Send to Customers</button>`
- `<button type="button" data-notification-tab="merchants">Send to Merchants</button>`
- `<button id="send-notification-button" type="button">Send notification</button>`

## Staging login failure cause and fix

The exact cause of the staging dashboard login failure was:

```html
var API='https://wenzla-backend-production.up.railway.app';
```

in `backend/admin.html`.

That made the staging dashboard send login/API requests to the production backend URL instead of the staging backend URL, which caused browser-side `Failed to fetch` / wrong-target behavior.

### Exact fix applied

```html
var API=window.location.origin;
```

### Result after fix
- staging dashboard now targets staging backend origin ✅
- admin login works on staging ✅
- notifications UI remains visible ✅
- production was not deployed ✅

## Remaining runtime testing steps

### Customer single-device test
1. Use customer app on a real device with valid Firebase config.
3. Login once so `/auth/customer/fcm-token` stores the device token.
4. Login to staging dashboard.
5. Open **Notifications → Send to Customers**.
6. Send a notification.
7. Confirm device receives push.

### Merchant single-device test
1. Login merchant app on a real device.
3. Confirm `/auth/merchant/fcm-token` succeeds.
4. Send staging merchant notification.
5. Confirm merchant device receives push.

### Broadcast staging test
1. Register multiple customer / merchant devices.
3. Send one customer broadcast.
4. Send one merchant broadcast.
5. Check `GET /admin/notifications/history`.
6. Verify `sentCount` and `failedCount`.

## Risks

1. **Merchant live push still needs runtime device verification**
   - local Firebase setup is now present
   - but a real signed-in merchant device is still needed to confirm token registration and actual push delivery

2. **No single-device admin test endpoint**
   - current implementation provides audience broadcast endpoints and history only

3. **Legacy `User.fcmToken` is still kept**
   - intentional for backward compatibility
   - new `DeviceToken` table is the durable multi-device path

4. **Dashboard code source split**
   - active served admin UI is in `backend/admin.html`
   - `admin-dashboard/` exists in workspace but is not the currently served dashboard path

## Confirmation of untouched logic

- Odoo logic was **not changed**
- Checkout/order creation logic was **not changed**
- Customer OTP auth flow was **not changed** except reusing existing token registration behavior
- Payment flow was **not changed**
- Order transaction logic was **not changed**

## Current review status

- Staging deploy completed
- Notifications UI is visible on staging
- Production was **not** deployed
- Not pushed to main
- Ready for human review before fixing the staging API-base blocker
