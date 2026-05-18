# Checkout Regression Fix Report

**Date:** 2026-05-18  
**Severity:** Critical — checkout completely blocked for users with saved cart items  
**Status:** FIXED and verified on Samsung SM-S928B (R3CX207GH3L)

---

## Root Cause

`StorageService.loadCart()` deserialized cart items from SharedPreferences JSON but
returned them as `List<dynamic>` where each element was `Map<dynamic, dynamic>`
(Dart's `jsonDecode` always produces un-typed generic maps for JSON objects).

The cart screen (`_buildCartGroup`, line 159) iterated over these items while expecting
`Map<String, dynamic>`, triggering a runtime subtype exception:

```
type '_Map<dynamic, dynamic>' is not a subtype of type 'Map<String, dynamic>'
at _CartScreenState._buildCartGroup.<anonymous closure> (cart_screen.dart:159)
```

Because the exception was thrown during the widget **build phase**, Flutter's error
boundary replaced the entire cart screen with a blank error widget — making it
impossible to fill in or submit the checkout form.  
Users who added items fresh in the same session were unaffected (in-memory
`Map<String, dynamic>` items); only users returning with items in SharedPreferences
experienced the crash.

---

## Why It Was a Regression

The cart screen was rewritten during the Design System / Polish Sprint.  The new
`_buildCartGroup` helper passes `items` through `List.of(...)` which performs an
eager typed copy — this materialises the lazy-cast failure immediately, whereas the
old implementation iterated differently and happened to never trigger the cast.

---

## Fix Applied

### 1. `lib/services/storage_service.dart` — deep-convert on load

**Before:**
```dart
return jsonDecode(raw) as List<dynamic>;
```

**After:**
```dart
final list = jsonDecode(raw) as List<dynamic>;
return list
    .whereType<Map>()
    .map((i) => i.map((k, v) => MapEntry(k.toString(), v)))
    .toList();
```

Every item deserialized from JSON is now a true `Map<String, dynamic>`.

---

### 2. `lib/state/app_state.dart` — defensive conversion in `loadCart()`

**Before:**
```dart
_cart = await StorageService.loadCart();
```

**After:**
```dart
final loaded = await StorageService.loadCart();
_cart = loaded.map<Map<String, dynamic>>((i) =>
    i is Map<String, dynamic> ? i : Map<String, dynamic>.from(i as Map)
).toList();
```

Secondary guard: even if a stale storage format slips through, `_cart` is always
`List<Map<String, dynamic>>` in memory.

---

### 3. `lib/services/api_service.dart` — error-response logging kept

A `debugPrint` was added to `_parse()` that logs any HTTP ≥ 400 response to logcat.
This is low-overhead and helps future debugging without exposing secrets:

```dart
if (res.statusCode < 200 || res.statusCode >= 300) {
  debugPrint('[API] ${res.statusCode} ${res.request?.url}: ${res.body}');
}
```

---

## Verification

| Check | Result |
|-------|--------|
| `flutter build apk --release` | ✓ PASS — 0 errors |
| Install on SM-S928B (`adb install -r`) | ✓ PASS |
| Cart screen renders with old saved items | ✓ PASS — no type crash |
| `_Map<dynamic, dynamic>` exception in logcat | ✗ GONE (absent from PID 21341+ after fix) |
| Pre-fix crash evidence in logcat (PIDs 17317–19223) | Confirmed all crashes before fix |
| Post-fix clean launches (PIDs 21341, 22546) | Confirmed — zero exceptions |

---

## Files Changed

| File | Change |
|------|--------|
| `lib/services/storage_service.dart` | Deep-convert JSON maps on `loadCart()` |
| `lib/state/app_state.dart` | Defensive cast in `loadCart()`; no changes to checkout logic |
| `lib/services/api_service.dart` | Added error-response debugPrint in `_parse()` |

---

## Notes

- No backend changes required.
- No navigation or checkout logic changed.
- Fix is backward-compatible: newly-added in-memory cart items are already
  `Map<String, dynamic>` and pass through the conversion unchanged.
- Old SharedPreferences `cart_data` entries are converted transparently on first
  read; no migration script needed.
