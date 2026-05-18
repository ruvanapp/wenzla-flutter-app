# Merchant App (سوق العسل - التجار) — Full QA Report

**Date:** 2026-05-12  
**Tester:** Automated Real-Device QA via ADB  
**Device:** Realme Android 15, 1080×2412, Device ID: YHHQC6DY7XVOIZEY  
**App Package:** com.wenzla.merchant  
**App Name:** سوق العسل - التجار  
**Build Type:** Release ARM64 APK  
**Backend:** https://wenzla-backend-production.up.railway.app  
**Test Credentials:** +15550000002 / merchant123 (seeded production account)

---

## Overall Verdict

| Category | Result |
|---|---|
| Installation | ✅ PASS |
| App Name & Branding | ✅ PASS |
| Authentication | ⚠️ PARTIAL — login works but session not persisted |
| Dashboard | ⚠️ PARTIAL — loads correctly but shows zeros briefly |
| Products | ❌ FAIL — add product crashes/navigates away |
| Orders | ⚠️ PARTIAL — list loads but status update UI broken |
| Store Profile | ✅ PASS |
| Background/Foreground | ✅ PASS |
| Force-Stop Recovery | ❌ FAIL — session lost |
| Security | ❌ FAIL — demo credentials exposed in release build |

**Production Readiness: NOT READY for Play Store**

---

## Bugs Found

---

### BUG-001 — CRITICAL: Demo Credentials Hardcoded in Production Release APK

**Severity:** CRITICAL  
**Screen:** Login Screen  
**Status:** Open

**Description:**  
The production release APK has real test credentials pre-filled in the login form:
- Phone: `+15550000002`
- Password: `merchant123`
- Store name: `Demo Market`

These credentials exist as live production database entries. Any person who installs the APK sees them and can log into a real merchant account.

**Root Cause:**  
`main.dart` initializes TextEditingControllers with hardcoded values:
```dart
TextEditingController(text: '+15550000002')
TextEditingController(text: 'merchant123')
TextEditingController(text: 'Demo Market')
```

**Risk:**
- Unauthorized access to production merchant account
- Real production orders, sales data, commission exposed
- Google Play policy violation: hardcoded credentials in release build

**Fix Required:**
```dart
// Remove defaults from controllers:
TextEditingController()  // empty, no default text
```
Also: delete or disable the +15550000002 production seed account, or at minimum change its password immediately.

---

### BUG-002 — CRITICAL: Session Token Not Persisted — Lost on Force-Stop

**Severity:** CRITICAL  
**Screen:** All screens after login  
**Status:** Open

**Description:**  
The merchant auth token is stored only in a `setState` variable (in-memory). When the app is force-stopped or killed by the Android system, the token is lost and the merchant must re-login every time.

**Steps to Reproduce:**
1. Open app, tap Login
2. Verify dashboard loads
3. Open Android recents → Force Stop, OR swipe app away from recents
4. Reopen app
5. App shows login screen again — session not restored

**Expected:** App restores session on reopen (same as most merchant apps)  
**Actual:** Login screen shown every time

**Root Cause:**  
`applyAuth()` stores token in `setState`:
```dart
void applyAuth(dynamic data) {
  setState(() {
    token = data['token'];
    ...
  });
}
```
No write to `SharedPreferences` or `FlutterSecureStorage`.

**Fix Required:**
```dart
// On login success:
final prefs = await SharedPreferences.getInstance();
await prefs.setString('merchant_token', data['token']);
await prefs.setString('merchant_id', data['user']['merchant']['id']);

// On app startup:
final token = prefs.getString('merchant_token');
if (token != null) { applyAuth(fromStoredToken(token)); }
```

---

### BUG-003 — HIGH: Add Product — App Navigates to Home Screen on Submission

**Severity:** HIGH  
**Screen:** Products Tab → Add Product Form  
**Status:** Open (needs manual verification)

**Description:**  
After filling the Add Product form and tapping "إضافة منتج", the app closed and returned to the Android home screen. The product was not added. No error message was shown.

**Steps to Reproduce:**
1. Login → go to Products tab
2. Fill: Product name, Description, Stock, Price, Weight
3. Do NOT upload an image
4. Tap "إضافة منتج"
5. App closes / returns to home screen

**Expected:** Show validation message "ارفع صورة المنتج أولاً" and stay on screen  
**Actual:** App exits to home screen

**Possible Causes:**
- Image picker button (`pickAndUploadImage`) triggered accidentally due to button proximity
- KEYCODE_BACK during keyboard dismissal navigated out of the app
- Unhandled exception in `saveProduct()` with missing mounted check
- Flutter async setState after widget disposal

**Validation Note:** `saveProduct()` in source code has correct image validation logic at line 416 (`if (imageController.text.trim().isEmpty)`). The actual trigger may be a UI proximity issue (image picker button overlaps Add Product button) or a test automation artifact.

**Fix Recommended:**
- Increase vertical spacing between "اختيار ورفع صورة" and "إضافة منتج" buttons
- Add `if (!mounted) return;` after every async call in `saveProduct()`
- Add try/catch around `pickAndUploadImage`

---

### BUG-004 — HIGH: Order Status Dropdown Not Working — Collapses Instead of Opening Picker

**Severity:** HIGH  
**Screen:** Orders Tab → Order Detail (expanded)  
**Status:** Open

**Description:**  
When an order card is tapped it expands inline to show order details and a PENDING status dropdown (▼). Tapping the dropdown area collapses the order card instead of opening a status selection dialog. Merchants cannot change order status from PENDING.

**Steps to Reproduce:**
1. Login → Orders Tab
2. Tap any order card (it expands with product info + PENDING ▼ dropdown)
3. Tap the PENDING dropdown or the ▼ arrow
4. Order card collapses — no picker opens

**Expected:** A status selection dialog/sheet opens with options: PENDING / CONFIRMED / SHIPPING / DELIVERED / CANCELLED  
**Actual:** Card collapses (same as tapping anywhere on the card header)

**Root Cause:** The tap handler for the dropdown (▼) is inside the same GestureDetector as the card expand/collapse toggle. The dropdown tap propagates to the card toggle and collapses it.

**Fix Required:** Use `GestureDetector(onTap: ..., child: ...)` specifically for the dropdown element and call `e.stopPropagation()` equivalent (`onTap:` with a separate callback that doesn't bubble up to the parent card).

---

### BUG-005 — MEDIUM: Dashboard Stats Show Zeros Briefly After Login

**Severity:** MEDIUM  
**Screen:** Dashboard (المبيعات tab)  
**Status:** Open

**Description:**  
Immediately after logging in, all dashboard stats show "0 ج.م" for sales, commission, and "0" for all counts. After a few seconds the real data loads. There is no loading indicator or skeleton screen.

**Observed:**
- Login success → dashboard shows all zeros (0 ج.م, 0 products, 0 orders, 0 pending)
- After ~3 seconds: real data appears (50 ج.م sales, 6 products, 11 pending)

**Fix Required:** Show a `CircularProgressIndicator` or skeleton card while `refreshAll()` is loading.

---

### BUG-006 — MEDIUM: Store Description in English on Arabic Store

**Severity:** MEDIUM  
**Screen:** Store Profile (المتجر tab)  
**Status:** Open (data issue, not code issue)

**Description:**  
The production store "مناحل القناوي" has its description set to "Fresh products and fast delivery" in English. The UI correctly shows whatever is in the database, but the store itself was created with an English description.

**Fix:** Admin should update the store description to Arabic. No code change required.

---

### BUG-007 — MINOR: No Store Logo/Image Upload in Store Profile

**Severity:** MINOR  
**Screen:** Store Profile (المتجر tab)  
**Status:** Open (feature gap)

**Description:**  
The store profile only allows editing: Store Name, Description, and Address. There is no option to upload a store logo or banner image. Customers seeing this store in the app see no visual identity.

**Fix Required:** Add image picker + upload endpoint for store logo.

---

### BUG-008 — MINOR: Missing "No Orders" Empty State

**Severity:** MINOR  
**Screen:** Orders Tab  
**Status:** Open

**Description:**  
If there were no orders, the Orders tab would show a blank screen with just the header. No empty state illustration or message. Currently has 17 orders so not visually noticeable, but worth noting for new merchants.

---

## Passed Tests

| Test | Result | Notes |
|---|---|---|
| APK installation | ✅ PASS | Clean install on Android 15 |
| App launch — cold start | ✅ PASS | App opens in ~2 seconds |
| App icon displayed | ✅ PASS | Honey jar icon visible |
| App name in launcher | ✅ PASS | "سوق العسل - التجار" |
| Splash screen | ✅ PASS | Brown themed splash loads |
| Login screen loads | ✅ PASS | All fields render correctly |
| Login with valid credentials | ✅ PASS | Dashboard loads successfully |
| Dashboard data loads | ✅ PASS | All 4 stat cards populated |
| Store status shown (APPROVED) | ✅ PASS | Banner visible on dashboard |
| Bottom navigation (4 tabs) | ✅ PASS | All tabs tappable and switching |
| Orders list loads | ✅ PASS | 17 orders shown correctly |
| Order inline expansion | ✅ PASS | Tap expands order detail |
| Order detail — product name | ✅ PASS | Shows correct product name |
| Order detail — amount | ✅ PASS | Shows correct EGP amount |
| Store Profile tab loads | ✅ PASS | All 3 fields editable |
| Background → Foreground | ✅ PASS | State preserved on resume |
| Products tab loads | ✅ PASS | Form and inventory list render |
| Product form validation | ✅ PASS | "أدخل وصف المنتج" shown correctly |
| Arabic RTL layout | ✅ PASS | RTL throughout the app |
| Arabic font rendering | ✅ PASS | Clean Arabic typography |
| Notification in tray | ✅ PASS | Notification with "سوق العسل" shown |
| Firebase notification display | ✅ PASS | Push notification received |
| Package name | ✅ PASS | com.wenzla.merchant (not com.example.*) |

---

## Security Findings

| Finding | Severity | Status |
|---|---|---|
| Demo credentials in production release APK | CRITICAL | ❌ Must Fix |
| Token stored in memory only (not encrypted storage) | HIGH | ❌ Must Fix |
| No biometric/device auth gate | MEDIUM | ⚠️ Recommended |
| Store description field has no length limit visible | LOW | ℹ️ Note |

---

## Performance Observations

| Observation | Impact |
|---|---|
| Cold start: ~2 seconds | Acceptable |
| Dashboard data load after login: ~3 seconds | Acceptable |
| Orders list load: ~2 seconds | Acceptable |
| No infinite loading states observed | Good |
| No memory warnings during testing | Good |
| No battery heating observed | Good |

---

## Missing Features (Play Store Blockers)

| Item | Priority |
|---|---|
| Session persistence (token in secure storage) | CRITICAL |
| Remove hardcoded demo credentials | CRITICAL |
| Order status change working (dropdown) | HIGH |
| Store logo upload | MEDIUM |
| Logout button | HIGH — no logout option found in any tab |
| Push token auto-refresh | MEDIUM |

---

## Logout Observation

**Important:** No logout button was found in any of the 4 tabs (Dashboard, Products, Orders, Store Profile). Once logged in, the only way to log out appears to be:
1. Force-stopping the app (which clears the in-memory token)
2. No intentional logout flow discovered

This is a HIGH severity UX issue — merchants need a way to log out securely.

---

## Recommended Fix Priority (Before Play Store)

| Priority | Fix |
|---|---|
| P0 | Remove hardcoded demo credentials from release build |
| P0 | Add logout button |
| P1 | Persist token in FlutterSecureStorage — restore on restart |
| P1 | Fix order status dropdown (prevent card collapse when dropdown tapped) |
| P2 | Add loading indicators on dashboard stats load |
| P2 | Verify add product form behavior with manual real-device test |
| P3 | Add store logo upload |
| P3 | Add empty state for orders/products lists |

---

## Test Environment

```
Device:          Realme Android 15
Screen:          1080 × 2412 px
ADB Device ID:   YHHQC6DY7XVOIZEY
APK:             com.wenzla.merchant (Release ARM64)
Backend:         https://wenzla-backend-production.up.railway.app
Test Account:    +15550000002 (production seed account)
Test Duration:   ~2 hours of automated adb testing
Screenshots:     Captured at every key state
```

---

*Report generated: 2026-05-12*  
*Next step: Apply P0/P1 fixes before Google Play Internal Testing submission*
