# Branding Verification Report
## Wenzla → سوق العسل / Souq Al Asal
**Date:** 2026-05-17

---

## Summary

| App | Old Name | New Name | versionCode |
|-----|----------|----------|-------------|
| Customer App | Wenzla | سوق العسل | 7 → **8** |
| Merchant App | ونزلا للتجار | سوق العسل للتجار | 8 → **9** |
| Admin Dashboard | Wenzla Admin | سوق العسل - Admin | — |

---

## Files Changed

### Customer App (`apps/customer_app/`)

| File | Change |
|------|--------|
| `lib/main.dart` line 115 | `title: 'Wenzla'` → `title: 'سوق العسل'` |
| `lib/main.dart` line 941 | Home header text `'ونزلا'` → `'سوق العسل'` |
| `lib/main.dart` line 1528 | Default profile name `'عميل ونزلا'` → `'عميل سوق العسل'` |
| `lib/main.dart` line 1868 | Store fallback description → `'متجر معتمد في سوق العسل'` |
| `android/app/src/main/AndroidManifest.xml` | `android:label="سوق العسل"` ✓ (was already set) |
| `pubspec.yaml` | description updated; `version: 1.0.6+8` |

### Merchant App (`apps/merchant_app/`)

| File | Change |
|------|--------|
| `lib/main.dart` line 80 | `title: 'ونزلا للتجار'` → `title: 'سوق العسل للتجار'` |
| `android/app/src/main/AndroidManifest.xml` | `android:label="سوق العسل - التجار"` ✓ (was already set) |
| `pubspec.yaml` | description updated; `version: 1.0.4+9` |

### Admin Dashboard (`admin-dashboard/`)

| File | Change |
|------|--------|
| `app/layout.tsx` line 5 | `title: 'Wenzla Admin'` → `title: 'سوق العسل - Admin'` |

---

## Release Artifacts

| Artifact | Size |
|----------|------|
| Customer APK `souq-al-asal-customer-v1.0.6+8.apk` | ~63 MB |
| Customer AAB `souq-al-asal-customer-v1.0.6+8.aab` | ~37 MB |
| Merchant APK `souq-al-asal-merchant-v1.0.4+9.apk` | ~48 MB |
| Merchant AAB `souq-al-asal-merchant-v1.0.4+9.aab` | ~24 MB |

All artifacts in: `~/Desktop/SOUQ_AL_ASAL_RELEASE/`

---

## Intentionally Preserved Technical Identifiers

The following contain "wenzla" but were intentionally NOT changed because they are
internal technical identifiers whose change would break production functionality:

| Identifier | Reason |
|-----------|--------|
| `wenzla-backend-production.up.railway.app` | Production API domain — cannot change without DNS update |
| `issuer: 'wenzla-api'`, `audience: 'wenzla-client'` | JWT claims — changing invalidates all active sessions |
| `wenzla/products`, `wenzla/store-logos` | Cloudinary storage paths — changing orphans production images |
| `WENZLA:${order.id}`, `wenzla_user_id:` | Odoo ERP data fields — changing corrupts order tracking |
| `wenzla_orders`, `wenzla_merchant_notifications` | Android notification channel IDs — internal only |
| `name: wenzla_customer_app`, `wenzla_merchant_app` | Flutter internal package names |
| `com.wenzla.customer`, `com.wenzla.merchant` | Android package IDs — must stay for Play Console continuity |

---

## What Users See After Update

- Customer app launcher label: **سوق العسل**
- Merchant app launcher label: **سوق العسل - التجار**
- Customer app home header: **سوق العسل**
- Merchant app title: **سوق العسل للتجار**
- Admin dashboard tab: **سوق العسل - Admin**
- Customer profile fallback name: **عميل سوق العسل**
- Store description fallback: **متجر معتمد في سوق العسل**

---

## Admin Dashboard Rebuild Required

Run `cd admin-dashboard && npm run build` to regenerate compiled output with the new title.
The `.next/` cache still shows old title until rebuilt and redeployed.

---

## Verdict

All user-visible branding updated to **سوق العسل**.
All 4 release artifacts built with incremented versionCodes.
No functional code was modified — display strings and metadata only.
