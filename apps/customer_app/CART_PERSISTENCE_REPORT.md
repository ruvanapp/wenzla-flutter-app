# Cart Persistence Compatibility Report
**Date:** 2026-05-18  
**App:** سوق العسل (customer_app)  
**Build:** release APK — `build/app/outputs/flutter-apk/app-release.apk` (34.1 MB)

---

## Summary

| Item | Result |
|------|--------|
| Unit tests (28 cases) | ✅ 28/28 PASS |
| `StorageService` hardening | ✅ Complete |
| `AppState` coercion fix | ✅ Complete |
| Schema migration v1 → v2 | ✅ Implemented & tested |
| Release APK build | ✅ Success |

---

## Changes Made

### 1. `lib/services/storage_service.dart`

**Schema versioning**
- Cart is now stored under key `cart_data_v2` (constant `_kSchemaVersion = 2`).
- Legacy key `cart_data` (v1) is migrated on first cold start after upgrade:
  items are validated, invalid ones dropped, result saved to `cart_data_v2`,
  and `cart_data` is deleted.

**Per-item validation** (`_isValidItem`)  
Items are silently dropped if any required field is missing:

| Field | Reason |
|-------|--------|
| `id` | Primary key — cannot display or de-duplicate without it |
| `name` | Displayed in cart UI |
| `merchantId` | Single-store enforcement; null value breaks checkout |
| `price` OR `salePrice` | Cannot calculate totals |

**Type coercion** (`_coerceItem`, `_toInt`, `_toDouble`)  
JSON round-trips in older Dart versions could store `qty: 2.0` (double) which
would crash `(i['qty'] as int?)`. Fixed coercion handles:

| Stored type | Field | Coerced to |
|-------------|-------|------------|
| `int` | `qty` | `int` (no-op) |
| `double` | `qty` | `int` via `.toInt()` |
| `String` | `qty` | `int` via `int.tryParse` (fallback 1) |
| `int` | `price`/`salePrice` | `double` via `.toDouble()` |
| `String` | `price`/`salePrice` | `double` via `double.tryParse` (fallback 0.0) |

**Migration always writes v2 key**  
Previously, a migration from v1 only wrote v2 if items were filtered.
Clean valid legacy carts left the v2 key absent, causing the next cold
start to attempt re-migration (re-reading a deleted v1 key → empty cart).
Fixed: `migratedFromLegacy` flag forces v2 write unconditionally.

**Absolute safety net**  
Outer `try/catch` around `SharedPreferences.getInstance()` ensures even
platform-level failures return `[]` instead of crashing.

---

### 2. `lib/state/app_state.dart`

**`cartCount` getter**  
```dart
// Before (crashes on double qty from cache):
int get cartCount => _cart.fold<int>(0, (s, i) => s + ((i['qty'] as int?) ?? 1));

// After (safe coercion):
int get cartCount => _cart.fold<int>(0, (s, i) {
  final q = i['qty'];
  return s + (q is int ? q : (q is num ? q.toInt() : 1));
});
```

---

## Test Coverage

### Groups and results

| Group | Tests | Result |
|-------|-------|--------|
| Happy path | T01–T04 | ✅ PASS |
| Corrupted data | T05–T09 | ✅ PASS |
| Invalid items | T10–T15 | ✅ PASS |
| Type coercion | T16–T20 | ✅ PASS |
| Schema migration v1→v2 | T21–T24 | ✅ PASS |
| Partial validity | T25–T26 | ✅ PASS |
| Cold start persistence | T27–T28 | ✅ PASS |
| **Total** | **28** | **✅ 28/28** |

### Key scenarios verified

- **T05** — Unparseable JSON (`{bad json{{[`) → empty cart, key cleared, no crash.
- **T06** — Top-level Map (not List) → empty cart, key cleared.
- **T12** — Item without `merchantId` (old app version) → filtered out, protecting single-store enforcement.
- **T16** — `qty: 2.0` (double) → coerced to `int` `2`.
- **T17** — `qty: "3"` (string) → coerced to `int` `3`.
- **T18** — `price: "250"` (string) → coerced to `double` `250.0`.
- **T21** — Valid legacy v1 cart → migrated to v2, legacy key deleted, v2 key present.
- **T22** — Legacy items missing `merchantId` → dropped during migration.
- **T23** — Both keys present → v2 wins, legacy ignored (no double-migration).
- **T25/T26** — Mixed valid+invalid batch → only valid items returned; cleaned list re-persisted.

---

## Behavior Matrix

| Scenario | Behavior |
|----------|----------|
| First install (no key) | Empty cart |
| Normal load (valid JSON) | Restore items |
| Corrupted JSON | Clear key, return empty cart |
| Top-level not a List | Clear key, return empty cart |
| Items with missing required fields | Drop invalid items, re-save cleaned list |
| `qty` stored as `double` | Coerce to `int` |
| `qty` stored as `String` | Coerce to `int` |
| `price` stored as `int` | Coerce to `double` |
| Legacy key only (v1→v2 migration) | Validate, save to v2, delete v1 |
| Both v1 + v2 keys (rare edge case) | v2 wins; v1 ignored |
| SharedPreferences platform failure | Return empty cart |
| App update (new code, old cache) | Validation handles any type mismatch |

---

## APK

```
Path:  apps/customer_app/build/app/outputs/flutter-apk/app-release.apk
Size:  34.1 MB
Mode:  release
ABI:   arm64-v8a
```

No debug flags. No debug banner. Production API endpoints intact.
