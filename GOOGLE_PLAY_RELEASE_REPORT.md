# Google Play Internal Testing Release Report
**Build Date:** 2026-05-15  
**Release Version:** 1.0.1+2  
**Build Type:** Release (obfuscated, minified, signed)  
**Environment:** Production backend — `https://wenzla-backend-production.up.railway.app`

---

## Release Artifacts

| App | File | Size | Path |
|-----|------|------|------|
| Customer App | `wenzla-customer-v1.0.1-play.aab` | 23 MB | `~/Desktop/WENZLA_PLAY_RELEASE_v1.0.1/` |
| Seller App | `wenzla-merchant-v1.0.1-play.aab` | 22 MB | `~/Desktop/WENZLA_PLAY_RELEASE_v1.0.1/` |

---

## Version Details

| Field | Customer App | Seller App |
|-------|-------------|------------|
| Package Name | `com.wenzla.customer` | `com.wenzla.merchant` |
| versionName | **1.0.1** | **1.0.1** |
| versionCode | **2** | **2** |
| App Label | سوق العسل | سوق العسل - التجار |
| Min SDK | 23 (Android 6.0) | 23 (Android 6.0) |
| AGP Version | 8.7.0 | 8.7.0 |

---

## Pre-Release Fixes Applied This Build

### FIX-001 — Removed `android:usesCleartextTraffic="true"` from Seller App
- **File:** `apps/merchant_app/android/app/src/main/AndroidManifest.xml`
- **Why:** Required for Google Play security policy. All backend calls already use HTTPS — the flag was legacy and provided no benefit.
- **Verification:** Confirmed absent in built AAB manifest.

### FIX-002 — Version incremented from 1.0.0+1 to 1.0.1+2
- **Files:** Both `pubspec.yaml` files
- **Why:** Google Play requires versionCode to be strictly higher than any previously uploaded version.

### FIX-003 — `PATCH /merchant/profile` hang on duplicate phone (Backend)
- **File:** `backend/src/routes/merchant.js`
- **Why:** Missing try/catch caused infinite HTTP hang when phone uniqueness constraint was violated. Now returns proper 409 error.
- **Status:** Deployed to production.

---

## Build Configuration Verification

| Check | Customer | Merchant |
|-------|----------|----------|
| Package name correct | `com.wenzla.customer` ✓ | `com.wenzla.merchant` ✓ |
| Release signing active | `META-INF/WENZLA.RSA` ✓ | `META-INF/WENZLA.RSA` ✓ |
| Signer identity | CN=mohamed elbana, O=wenzla ✓ | CN=mohamed elbana, O=wenzla ✓ |
| jarsigner verify | `jar verified` ✓ | `jar verified` ✓ |
| `android:debuggable` | not set ✓ | not set ✓ |
| `usesCleartextTraffic` | not set ✓ | removed ✓ |
| ProGuard/R8 minify | enabled ✓ | enabled ✓ |
| Resource shrinking | enabled ✓ | enabled ✓ |
| Code obfuscation | `--obfuscate` ✓ | `--obfuscate` ✓ |
| Debug symbols | `build/symbols/customer/` ✓ | `build/symbols/merchant/` ✓ |
| ProGuard map | 20,051 KB ✓ | 17,154 KB ✓ |
| Firebase Crashlytics | included ✓ | included ✓ |
| Firebase Analytics | — | included ✓ |
| `flutter analyze` | No issues ✓ | No issues ✓ |

---

## API & Environment Verification

| Check | Result |
|-------|--------|
| Production API URL | `https://wenzla-backend-production.up.railway.app` |
| API default (String.fromEnvironment) | Hardcoded as production fallback ✓ |
| No staging/localhost URLs | Verified ✓ |
| Debug print statements | None found ✓ |
| Backend health | `{"status":"ok"}` ✓ |
| Customer catalog | 17 APPROVED honey stores ✓ |
| Seller auth + products | Working ✓ |

---

## Included Features (v1.0.1)

### Customer App
- Honey marketplace with 17 stores, 100 products
- Phone OTP authentication
- Product search and filtering
- Add to cart / checkout flow
- Order history
- Push notifications (Firebase)
- Firebase Crashlytics integration
- Google Maps integration
- Arabic RTL layout

### Seller App
- Phone/password authentication with E.164 normalization
- Seller dashboard (orders, products, revenue)
- **New: Store profile management** — logo, banner, description, address, business hours
- Product CRUD with image upload (Cloudinary)
- Order status management
- Push notifications (Firebase)
- Firebase Analytics + Crashlytics
- WhatsApp deep-link integration
- Arabic RTL layout

---

## Release Notes (for Google Play Internal Testing)

```
Version 1.0.1 (Build 2)

What's new:
• Seller store profile management — sellers can now upload store logos,
  banners, and edit store information directly from the app.
• Improved checkout reliability — orders no longer blocked by Odoo sync status.
• Phone number normalization — sellers can log in with local Egyptian format (01XXXXXXXXX).
• Performance improvements and stability fixes.
• Security improvements.
```

---

## Known Limitations (Internal Testing Only)

| # | Item | Severity | Notes |
|---|------|----------|-------|
| L1 | Odoo ERP sync disabled | Low | ODOO_SYNC_ENABLED=false; orders created normally, Odoo integration pending |
| L2 | Customer checkout requires manual OTP | Low | Standard flow — not a blocker |
| L3 | Google Maps API key hardcoded | Low | Acceptable for internal testing; restrict in production GA |
| L4 | Firebase push tokens require device grant | Low | Standard Android permission behavior |
| L5 | `NOTICES.Z` jarsigner warning | Info | Known Flutter/AGP behavior, harmless — accepted by Google Play |

---

## Remaining Google Play Blockers (Before Public Launch)

| # | Item | Priority |
|---|------|----------|
| B1 | App screenshots and store listing assets | Required |
| B2 | Privacy policy URL | Required |
| B3 | Content rating questionnaire | Required |
| B4 | Google Play target audience declaration | Required |
| B5 | Enable Play App Signing (recommended) | High |
| B6 | Restrict Maps API key to production package | Medium |
| B7 | Odoo sync re-enable with proper product mapping | Low (post-launch) |

---

## Final Build Verdict

**READY FOR GOOGLE PLAY INTERNAL TESTING**

Both AABs are production-quality signed release builds with:
- No debug flags
- No cleartext traffic
- Full obfuscation and minification
- Production API endpoints
- Firebase Crashlytics for crash monitoring
- All core marketplace flows verified

Upload order:
1. Upload `wenzla-customer-v1.0.1-play.aab` to Google Play Console → Internal Testing track for `com.wenzla.customer`
2. Upload `wenzla-merchant-v1.0.1-play.aab` to Google Play Console → Internal Testing track for `com.wenzla.merchant`
