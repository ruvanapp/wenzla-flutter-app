# REGRESSION QA REPORT — Customer App
**Date:** 2026-05-18  
**Device:** Samsung SM-S928B (R3CX207GH3L) — Android, connected via USB  
**Build tested:** versionCode=8 / versionName=1.0.6 (release APK)  
**APK path:** `build/app/outputs/flutter-apk/app-release.apk`

---

## Summary

| Category | Result |
|---|---|
| Cold / warm start | ✅ PASS |
| Session persistence | ✅ PASS |
| Store browsing + scroll | ✅ PASS |
| Logos rendering (2-column grid) | ✅ PASS |
| Add product to cart (fresh session) | ✅ PASS |
| Cart render after app restart (persisted cart) | ✅ FIXED (see Bug 1) |
| Qty +/- buttons in cart | ✅ FIXED (see Bug 2) |
| Remove from cart | ✅ PASS |
| Checkout form + city selector | ✅ PASS |
| Checkout submission (تأكيد الطلب) | ✅ PASS |
| Order appears in Orders tab auto-refresh | ✅ PASS |
| Background/foreground cycle | ✅ PASS |
| Rapid navigation stress | ✅ PASS |
| RTL alignment | ✅ PASS |
| No Flutter overflow / RenderFlex errors | ✅ PASS |
| Logcat — new build PID (29478) error count | **0** |

---

## Bugs Found & Fixed

### Bug 1 — Cart render crash on persisted cart load (FIXED)
- **Severity:** Critical  
- **Symptom:** App crashed/showed error UI immediately when opening cart tab after restart, if cart items were saved from a previous session.  
- **Root cause:** `StorageService.loadCart()` decoded SharedPreferences JSON and returned each element as `Map<dynamic, dynamic>`. The redesigned `_buildCartGroup()` used an eager `List.of(...)` which materialized the type check at runtime and threw `type '_Map<dynamic, dynamic>' is not a subtype of type 'Map<String, dynamic>'`.  
- **Fix:** `StorageService.loadCart()` now deep-converts every element: `.map((i) => i.map((k, v) => MapEntry(k.toString(), v))).toList()` with return type `List<Map<String, dynamic>>`. Secondary guard added in `AppState.loadCart()`.  
- **Files changed:** `lib/services/storage_service.dart`, `lib/state/app_state.dart`  
- **Verification:** PIDs 15881–19223 (pre-fix): repeated crashes. PIDs 21341, 22546 (partially-fixed build, Fix 1 only): cart renders, but qty crash remains.

### Bug 2 — Cart qty +/- crash on mutation (FIXED)
- **Severity:** Critical  
- **Symptom:** Tapping `+` or `−` on a cart item threw the same type error: `type '_Map<dynamic, dynamic>' is not a subtype of type 'Map<String, dynamic>' of 'value'` at `AppState.updateCartQty` line 262.  
- **Root cause:** `updateCartQty` (and by the same pattern, `addToCart`) used bare Dart spread syntax `{..._cart[idx], 'qty': newQty}` which, when `_cart[idx]` is typed as `dynamic` at the assignment site, produces `Map<dynamic, dynamic>`. The assignment back into `_cart[idx]` then fails the runtime type check.  
- **Fix:** All three mutation methods (`addToCart`, `updateCartQty`, `removeFromCart`) now use `Map<String, dynamic>.from(_cart[idx] as Map)` to force explicit typing before spread, and assign back using `<String, dynamic>{...cur, ...}` literals.  
- **Files changed:** `lib/state/app_state.dart`  
- **Verification:** PID 22546 / 26789 (pre-fix): crashes on qty tap. PID 29478 (new fixed build, installed 08:19:58): **zero type errors** in logcat.

---

## Logcat Evidence

| PID | Time | Status |
|---|---|---|
| 15881–19223 | 07:26 | Bug 1 crashes (cart render) |
| 21341 | 07:39 | Bug 1 fixed, Bug 2 untested |
| 22546 / 26789 | 07:44–08:08 | Bug 2 crashes (qty mutation) |
| **29478** | **08:19** | **Zero errors — both fixes in place** |

---

## Flows Verified on Device (PID 29478)

1. **Cold start** — app launches normally, home loads  
2. **Store browsing** — 2-column grid scrolls smoothly, logos render  
3. **Product details** — opens correctly, images load  
4. **Add to cart** — multiple products added, cart badge updates  
5. **Cart screen (fresh session)** — renders without error  
6. **Cart screen (persisted session)** — relaunch with saved items, renders correctly  
7. **Qty buttons** — +/- work without crash, totals update  
8. **Remove item** — works correctly  
9. **Checkout form** — city dropdown (27 governorates), address fields  
10. **Checkout submit** — order created, success toast shown, cart cleared  
11. **Orders tab** — new order appears automatically (auto-refresh)  
12. **Background/foreground** — no state loss  
13. **Rapid tab switching** — stable

---

## Remaining Notes

- No other crash categories observed in new build logcat.  
- Impeller rendering backend (Vulkan) active — normal, non-error messages only.  
- `versionCode=8` confirmed on device post-install.

## Verdict

**PASS — Safe for Google Play Internal Testing.**  
All critical cart type crashes resolved. Core ordering flow verified end-to-end on real device.
