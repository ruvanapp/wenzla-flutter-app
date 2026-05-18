# POLISH SPRINT 1 — CUSTOMER APP

**Date:** 2026-05-18  
**Status:** COMPLETE ✅  
**APK:** `~/Desktop/WENZLA_FINAL_RELEASE_V2/customer-app-polish-v1.0.7.apk`  
**Tested on:** Samsung (R3CX207GH3L) — real device, release build

---

## Changes Summary

### widgets.dart — New/Upgraded Widgets

| Widget | Change |
|--------|--------|
| `ShimmerBox` | **NEW** — animated wave shimmer using `AnimationController` + `LinearGradient`. No external package. |
| `SkeletonStoreCard` | **NEW** — grid card skeleton shown while stores load (2-column). |
| `SkeletonFeaturedCard` | **NEW** — horizontal featured store skeleton. |
| `FadeInWidget` | **NEW** — fade + subtle slide-up animation for any child. Accepts `delay` for staggered lists. |
| `TapScaleWidget` | **NEW** — scale-down (0.94×) on press via `ScaleTransition`. Wraps store/category tap targets. |
| `HoneyButton` | **UPGRADED** — now a `StatefulWidget` with press scale feedback (0.96×, 80ms). |
| `NetImage._shimmer()` | **UPGRADED** — now uses `ShimmerBox` instead of a static grey container. |
| `QtySelector` | **UPGRADED** — quantity number now uses `AnimatedSwitcher` with `ScaleTransition` on change. |
| `EmptyState` | **UPGRADED** — icon, title, subtitle, and CTA button each fade in with staggered delays. |

---

### home_screen.dart

| Fix | Detail |
|-----|--------|
| Banner dots rebuild | Replaced `setState()` with `ValueNotifier<int>` → only the 6-pixel dots row rebuilds on page change, not the entire screen. |
| Loading state | Shows `SkeletonFeaturedCard` (×4) and `SkeletonStoreCard` (×6) grid while data loads. |
| Store cards | Wrapped with `TapScaleWidget` for press feedback. |
| Category chips | Wrapped with `TapScaleWidget` for press feedback. |
| Staggered animation | Grid cards appear with `FadeInWidget` staggered per-index (50ms gap, capped at 400ms). |
| Featured stores | Each card fades in with 80ms stagger. |
| Categories | Each chip fades in with 60ms stagger. |

---

### cart_screen.dart

| Fix | Detail |
|-----|--------|
| Double-tap guard | Added `_submitting` bool in `_CartScreenState`. `_placeOrder()` returns immediately if `_submitting` or `st.checkingOut` is already true. Prevents concurrent order submissions. |
| Button disabled state | Button shows loading and is disabled while `_submitting || st.checkingOut`. |

---

### orders_screen.dart

| Fix | Detail |
|-----|--------|
| Skeleton loader | Replaced `CircularProgressIndicator` with `_buildOrderSkeletons()` — shows 4 animated shimmer order cards while loading. |
| Staggered animation | Order cards appear with `FadeInWidget` staggered at 60ms per card (capped at 300ms). |

---

## Smoke Test Results

| Test | Result |
|------|--------|
| App launches | ✅ PASS |
| Home screen renders | ✅ PASS |
| Banner slider | ✅ PASS |
| Categories section | ✅ PASS |
| Featured stores horizontal | ✅ PASS |
| All stores 2-column grid | ✅ PASS |
| Promo banner | ✅ PASS |
| Pull-to-refresh | ✅ PASS |
| No Flutter errors in logcat | ✅ PASS |
| No crashes / ANRs | ✅ PASS |

---

## Performance Notes

- Banner page changes no longer cause HomeScreen full rebuild.  
  Only the 3-dot indicator row (`ValueListenableBuilder`) rebuilds.
- Shimmer animations are self-contained per `ShimmerBox` instance — no shared ticker overhead.
- `FadeInWidget` disposes its `AnimationController` automatically on unmount.
- `TapScaleWidget` uses a single `AnimationController` per instance — very lightweight.

---

## Known Low-Risk Limitations

- Category icons still use generic `Icons.category_rounded` for unknown category names not in `kCategoryVisuals` map — not a regression.
- Store logos fall back to gradient initials for stores without matching `_kLogoMap` entry — same as before.
- The `AHardwareBuffer` GPU errors in logcat are device-level (Samsung Vulkan/Impeller) and are not caused by these changes.

---

## Files Modified

```
apps/customer_app/lib/widgets/widgets.dart
apps/customer_app/lib/screens/home/home_screen.dart
apps/customer_app/lib/screens/cart/cart_screen.dart
apps/customer_app/lib/screens/orders/orders_screen.dart
```

No backend, API, database, navigation, or authentication changes were made.
