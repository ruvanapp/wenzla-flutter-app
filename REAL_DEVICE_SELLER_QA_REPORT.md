# Real Device Seller QA Report

## Device / Environment
- Device: Samsung Galaxy S24 Ultra (`SM-S928B`)
- Android version: 16
- Backend: staging only (`https://wenzla-backend-staging.up.railway.app`)
- App under test: `com.wenzla.merchant`
- Test merchant: `+20100000002` / `test123` (`TEST_Store 2`)

## Build verified
- Installed APK: `apps/merchant_app/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk` initially, then updated with `apps/merchant_app/build/app/outputs/flutter-apk/app-release.apk`
- Real-device install: passed
- App launch: passed
- Permission prompt on first open: notifications prompt shown

## Confirmed fixes validated during QA
1. Seller auth fields no longer start with demo-prefilled values.
2. Merchant phone input now normalizes to `+` E.164-style before login.
3. Authenticated seller login succeeded on the real device after the normalization fix.

## Passed Tests
### 1. Install / launch / update
- Fresh install succeeded.
- App launches on real device without crash.
- Reinstall/update after auth-field fix succeeded.

### 2. Authentication
- Seller login: **passed after fix**.
- Session restored after returning app to foreground: **passed**.
- Store header correctly showed `TEST_Store 2`: **passed**.

### 3. Seller dashboard / sales overview
- Authenticated state visible.
- Sales tab and navigation shell render: **passed**.
- No immediate crash/ANR on dashboard entry: **passed**.

### 4. Orders
- Orders tab renders real seeded orders: **passed**.
- Real customers/order totals visible:
  - `Test Customer 1 / 75 ج.م`
  - `Test Customer 3 / 525 ج.م`
  - `Test Customer 2 / 150 ج.م`
- Order status action button rendered: **passed**.

### 5. Background / foreground / reopen
- App sent to background and reopened: **passed**.
- Session stayed authenticated on reopen: **passed**.

### 6. Orientation
- Landscape render captured without crash: **passed**.

## Failed / Blocked Tests
### 1. Products CRUD
- Could not truthfully complete create/edit/delete product end-to-end.
- Bottom-tab tap automation on the physical phone was inconsistent during the run, so the products screen flow was not fully verified.
- Status: **blocked / not fully proven**.

### 2. Image upload
- Could not complete a full in-app product image upload flow because product create/edit flow was not fully reached and verified.
- Status: **blocked / not fully proven**.

### 3. Order status update verification
- Orders UI clearly renders and exposes status action button.
- However, I did **not** complete a trustworthy end-to-end status mutation confirmation back to DB during this run.
- Status: **partially verified only**.

### 4. Logout
- Logout flow not fully proven in this run.
- Status: **not completed**.

### 5. Notifications end-to-end
- Notification permission prompt was shown.
- Real push receipt / tray render / tap-open behavior were **not fully executed** in this run.
- Status: **not completed**.

### 6. Slow network handling
- Not fully executed on the real device during this run.
- Status: **not completed**.

## Device-specific / runtime issues found
### Major
1. **Seller auth fields originally shipped with demo-prefilled values**
   - Real-device impact: login attempts could silently concatenate with test/demo values and fail.
   - Fixed during this task.

2. **Merchant phone exact-format mismatch blocked real-device login**
   - Backend expects exact phone match including leading `+`.
   - App previously sent raw digits as typed.
   - Fixed during this task with isolated normalization.

### Medium
3. **Bottom navigation interaction is inconsistent under ADB-driven real-device taps**
   - Orders tab was reachable and visible.
   - Products/store tab transition was not reliably reproducible via scripted tap coordinates.
   - This needs a manual tap verification pass or more robust accessibility-target interaction tooling.

### Minor
4. **Permission flow appears on first launch**
   - Expected behavior, not a bug by itself.
   - Should still be manually reviewed for clarity/UX.

## Performance observations
- Launch time on device felt acceptable after install.
- No crash observed on launch, login success path, foreground/background return, or landscape switch.
- No ANR observed from seller app during tested flows.
- No obvious severe UI lag captured in the verified flows.

## Screenshots / artifacts
- `/tmp/merchant_permission_prompt.png`
- `/tmp/merchant_after_permission.png`
- `/tmp/merchant_auth_screen.png`
- `/tmp/merchant_dashboard_real_device.png`
- `/tmp/merchant_orders_real_device.png`
- `/tmp/merchant_landscape.png`
- `/tmp/real_device_preinstall.png`

## Files changed during fix phase
- `apps/merchant_app/lib/main.dart`

## Minimal code fixes applied
1. Cleared merchant auth controllers on startup so auth fields start empty.
2. Normalized merchant phone number before login/register requests.
3. Earlier safe request timeout fix remained in place for merchant app request handling.

## Production readiness assessment
- **Not yet fully ready for production seller testing sign-off**.
- Real-device login and authenticated session now work, which removes the biggest blocker.
- However, these flows still need completion/proof before final production-style approval:
  1. products CRUD fully verified
  2. image upload fully verified
  3. order status mutation confirmed end-to-end
  4. logout verified
  5. real notification receipt/tap behavior verified
  6. slow/offline network handling verified

## Final verdict
- **Partially passed real-device seller QA**.
- Core progress achieved:
  - install works
  - launch works
  - real-device login now works after minimal fixes
  - authenticated session and orders rendering work
  - reopen/background behavior works
- Remaining seller-release blockers are now focused on **unproven feature coverage**, not the previous auth-entry failure.
