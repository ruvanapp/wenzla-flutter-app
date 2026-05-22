# Notification System — Final Verification Report
**Date**: 2026-05-21  
**Devices Tested**:
- Samsung SM-S928B (Galaxy S24 Ultra, Android 15) — `R3CX207GH3L`
- Realme RMX3771 (Android 15) — `YHHQC6DY7XVOIZEE`

**APK**: `souq-al-asal-notifications-fix.apk`  
**Version**: 1.0.9 (versionCode 11)  
**Git tag**: `stable-cms-notifications-v1` (commit `f3b6729`)

---

## Static Verification Results

| Check | Status | Evidence |
|-------|--------|----------|
| APK installed on Samsung SM-S928B | ✅ PASS | `adb install -r` → Success, versionCode=11 |
| APK installed on Realme RMX3771 | ✅ PASS | Already installed, versionCode=11 |
| Firebase initializes on Samsung | ✅ PASS | logcat: `FirebaseApp initialization successful` |
| Firebase Messaging background service | ✅ PASS | logcat: `FlutterFirebaseMessagingBackgroundService started!` |
| `wenzla_orders` channel on Samsung | ✅ PASS | `dumpsys notification`: mImportance=4 (HIGH) |
| `wenzla_orders` channel on Realme | ✅ PASS | `dumpsys notification`: mImportance=4 (HIGH) |
| Backend health check | ✅ PASS | `/health` returns `{"status":"ok"}` |
| `_pendingFcmToken` pattern in code | ✅ PASS | `app_state.dart` lines 89–109 |
| `_flushFcmToken()` after `initAuth()` | ✅ PASS | `app_state.dart` line 46 |
| `_flushFcmToken()` after `verifyOtp()` | ✅ PASS | `app_state.dart` line 71 |
| Notification tap handlers registered | ✅ PASS | `main.dart` lines 117–135 |
| `channelId: 'wenzla_orders'` in backend | ✅ PASS | `notifications.js` line 156, 179 |
| Firebase init logs in backend | ✅ PASS | `firebase.js` lines 17–29 |
| `type` field in FCM data payloads | ✅ PASS | `admin.js`, `merchant.js` updated |

---

## Dynamic Tests (require physical OTP login)

The following tests require physical device interaction (OTP entry) and must be performed manually:

| Test | Instructions |
|------|-------------|
| FCM token registration after login | Login via OTP → check Railway logs for `notifications.single_send.ok` or `PATCH /auth/customer/fcm-token` |
| Foreground notification | While app is open, change order status from dashboard → expect heads-up banner |
| Background notification | App backgrounded → change order status → expect heads-up banner |
| Killed-app notification | Force-stop app → change order status → expect system tray notification → tap → app opens to Orders |
| Order placed → merchant notification | Customer places order → merchant app receives heads-up |
| Order status → customer notification | Merchant/admin changes status → customer receives heads-up |
| Token refresh after reinstall | Uninstall + reinstall → login → verify token updated in DB |

---

## Root Causes Fixed (Summary)

### Critical Fix 1 — FCM Token Lost on Startup
**Problem**: `updateFcmToken()` was called before `initAuth()` completed. `isLoggedIn` was `false` so the token was dropped.  
**Fix**: Added `_pendingFcmToken` field. Token is always cached, flushed after auth restores.

### Critical Fix 2 — No Heads-Up Popups on Android 8+
**Problem**: Backend sent notifications without `android.notification.channelId`. Android used default channel (IMPORTANCE_DEFAULT = silent).  
**Fix**: `channelId: 'wenzla_orders'` added to all customer FCM messages; `channelId: 'wenzla_merchant_notifications'` for merchant messages.

### Moderate Fix 3 — No Notification Tap Navigation
**Problem**: Customer app had no `getInitialMessage()` or `onMessageOpenedApp` handler.  
**Fix**: Added `_setupNotificationTapHandlers()` — navigates to Orders tab when notification tapped.

### Moderate Fix 4 — Missing `type` Field in FCM Data
**Problem**: `data` payload had no `type` key — tap handler couldn't decide routing.  
**Fix**: `type: 'order_update'` added to all order status FCM messages.

### Moderate Fix 5 — Silent Firebase Init Failure
**Problem**: Firebase Admin SDK failed silently if env vars missing.  
**Fix**: Explicit `console.log/warn/error` at init time.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/customer_app/lib/state/app_state.dart` | Pending-token pattern, post-login + post-initAuth flush |
| `apps/customer_app/lib/main.dart` | Notification tap handlers, Android channel HIGH importance |
| `backend/src/config/firebase.js` | Startup logs (success / warning / error) |
| `backend/src/services/notifications.js` | `channelId` param, null-token warning |
| `backend/src/routes/admin.js` | Correct `channelId` + `type` per recipient |
| `backend/src/routes/merchant.js` | Correct `channelId` + `type` per recipient |
| `backend/src/routes/customer.js` | Merchant notifications use `wenzla_merchant_notifications` |

---

## Production Readiness

| Component | Status |
|-----------|--------|
| Customer app notification infrastructure | ✅ Ready |
| Merchant app notification infrastructure | ✅ Was already working |
| Backend FCM send service | ✅ Ready |
| Android channel HIGH importance | ✅ Confirmed on 2 devices |
| Notification tap → Orders navigation | ✅ Ready |
| Git checkpoint | ✅ `stable-cms-notifications-v1` |

**Verdict**: All code-verifiable aspects of the notification system are production-ready.  
End-to-end functional tests (FCM token flow, actual notification delivery) require physical OTP login on device.
