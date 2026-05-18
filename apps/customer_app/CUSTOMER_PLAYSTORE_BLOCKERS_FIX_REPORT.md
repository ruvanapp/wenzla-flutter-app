# CUSTOMER PLAYSTORE BLOCKERS FIX REPORT
**Date:** 2026-05-12  
**Branch:** customer-ui-improvements (customer app only)  
**Backend untouched:** YES  
**Production not deployed:** YES  

---

## SUMMARY OF ALL FIXES

### 1. Package Name Rename
| Field | Before | After |
|-------|--------|-------|
| applicationId | com.example.wenzla_customer_app | com.wenzla.customer |
| namespace | com.example.wenzla_customer_app | com.wenzla.customer |

**Files changed:**
- `apps/customer_app/android/app/build.gradle.kts` — applicationId + namespace
- `apps/customer_app/android/app/src/main/AndroidManifest.xml` — package attribute
- `apps/customer_app/android/app/src/main/kotlin/com/wenzla/customer/MainActivity.kt` — new file with correct package
- `apps/customer_app/android/app/google-services.json` — package_name updated

### 2. Session Persistence
- Auth token saved to SharedPreferences via `flutter_secure_storage`
- On cold start: restores token from storage, calls `/customer/auth/me` to validate
- If valid: sets logged-in state, skips OTP screen
- If invalid/expired: clears storage, shows guest mode
- Logout: clears storage + resets state

**Files changed:** `apps/customer_app/lib/main.dart`

### 3. Cart Persistence
- Cart stored in SharedPreferences as JSON
- Loaded on app startup
- Updated on every add/remove/quantity change
- Cleared only after successful order placement or explicit cart clear
- Survives: force-stop, reboot, background kill

**Files changed:** `apps/customer_app/lib/main.dart`

### 4. Navigation Bugs Fixed (found during QA)
- **Store navigation:** `loadStore()` now sets `tabIndex = 6` — store detail opens correctly
- **Product detail navigation:** product card `onTap` now sets `tabIndex = 7`
- **Back from store detail:** resets `tabIndex = 0`
- **Back from product detail:** resets `tabIndex = 6` if inside a store, else `tabIndex = 0`

These were **critical** bugs making the entire browse/shop flow non-functional.

### 5. Permissions Cleanup
**Removed:**
- `ACCESS_BACKGROUND_LOCATION` — not required by app
- `usesCleartextTraffic="true"` — all APIs use HTTPS

**Kept:**
- `POST_NOTIFICATIONS` — required for FCM
- `INTERNET` — required
- `ACCESS_NETWORK_STATE` — required
- `VIBRATE`, `WAKE_LOCK` — required for FCM
- `ACCESS_FINE_LOCATION` — kept (may be used for delivery address)

### 6. Network Reliability
- HTTP timeout set to 15 seconds on all API calls
- Handles Railway 502/HTML non-JSON responses with user-friendly Arabic error messages
- Shows snackbar: "تعذر الاتصال بالخادم" on network errors
- No infinite loading states

### 7. Flutter Crash Hardening
- `mounted` checks added before all `setState()` calls that follow async operations
- `IndexedStack` children/index mismatch fixed (was causing potential index-out-of-range)
- Image `errorBuilder` added for all product/store images

### 8. Google Maps API Key
- No hardcoded Maps API key found in this app
- Not applicable

---

## BUILD VALIDATION

```
flutter analyze: PASS (0 errors)
flutter build apk --release --split-per-abi: PASS
Package name: com.wenzla.customer (confirmed)
APK signed with: CN=mohamed elbana, OU=wenzla, O=wenzla
APK size (arm64): 18MB
```

---

## REAL DEVICE VALIDATION

| Test | Result |
|------|--------|
| App installs on Android 15 | PASS |
| Cold start — no crash | PASS |
| Home screen loads stores | PASS |
| Store card navigation | PASS |
| Product detail navigation | PASS |
| Add to cart | PASS |
| Cart persistence after kill | PASS |
| Checkout → OTP login gate | PASS |
| Categories tab | PASS |
| Search with text input | PASS |
| Account tab | PASS |
| No crashes in full session | PASS |
| Package name ≠ com.example.* | PASS |
| No background location permission | PASS |
| No cleartext traffic | PASS |

---

## APK OUTPUT

```
Path: apps/customer_app/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
Copied to: ~/Desktop/wenzla-final-apks/wenzla-customer-arm64-release.apk
Size: 18MB
Build type: release
Architecture: arm64-v8a
```

---

## WHAT WAS NOT CHANGED

- Backend API endpoints — unchanged
- Odoo sync logic — unchanged
- OTP verification backend logic — unchanged
- Order creation logic — unchanged
- Merchant app — unchanged (separate package)
- Authentication flow logic — unchanged (only token persistence layer added)
- Checkout business logic — unchanged

---

## REMAINING PLAY STORE STEPS

1. Upload product and store images in admin dashboard
2. Register `com.wenzla.customer` in Firebase Console and download new `google-services.json`
3. Run real OTP login test with live phone number
4. Prepare 4–8 screenshots of each key screen
5. Upload to Google Play Console as internal testing track
6. Add Play Store listing: short description, full description, privacy policy

---

## RISKS

| Risk | Mitigation |
|------|-----------|
| FCM tokens won't work until Firebase Console updated | Update before internal test distribution |
| Session token not yet tested with real OTP (no real phone used in QA) | Test manually before public release |
| Categories in DB have English names only | Add Arabic names via admin or Odoo sync |
