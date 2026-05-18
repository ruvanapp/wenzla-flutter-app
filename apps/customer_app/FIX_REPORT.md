# FIX REPORT — Giant Gold Panel Bug

**Date:** 2026-05-18  
**Status:** FIXED ✓  
**Verified on:** Samsung Galaxy S24 Ultra (SM-S928B / R3CX207GH3L)

---

## Fix Applied

**File:** `apps/customer_app/lib/screens/product_detail/product_detail_screen.dart`

**Change:** Wrapped `HoneyButton` in a `SizedBox(height: 52)` inside `Expanded` in the `bottomNavigationBar` Row.

### Before (broken)

```dart
Expanded(
  child: HoneyButton(
    label: stock == 0 ? 'نفد من المخزون' : 'أضف إلى السلة',
    onPressed: ...,
  ),
),
```

### After (fixed)

```dart
Expanded(
  child: SizedBox(
    height: 52,
    child: HoneyButton(
      label: stock == 0 ? 'نفد من المخزون' : 'أضف إلى السلة',
      onPressed: ...,
    ),
  ),
),
```

---

## Why This Fix Works

`SizedBox(height: 52)` sets **tight** height constraints on `HoneyButton` (min = max = 52dp). This overrides the loose `maxHeight ≈ 763dp` that `Expanded` received from the Row. The `Center` inside `HoneyButton` now fills to 52 - 30 (padding) = 22dp — the actual text height — instead of expanding to the full screen.

**Resulting layout heights:**
| Widget | Height |
|---|---|
| HoneyButton | 52dp (tight) |
| Row | max(Column 57dp, SizedBox 52dp) = 57dp |
| SafeArea (+ bottom inset 48dp) | 105dp |
| Container (+ v padding 32dp) | 137dp |
| **bottomNavigationBar** | **~137dp** ✓ |
| **body (product detail content)** | **~754dp** ✓ |

---

## Verification Results

| Test | Result |
|---|---|
| Product detail screen renders correctly | ✓ PASS |
| Product image visible in SliverAppBar | ✓ PASS |
| Product title, description visible | ✓ PASS |
| "أضف إلى السلة" button compact at bottom | ✓ PASS |
| "الإجمالي" price visible next to button | ✓ PASS |
| Add to cart works (snackbar shown) | ✓ PASS |
| Cart screen renders correctly (no giant panels) | ✓ PASS |
| Cart items show thumbnails and prices | ✓ PASS |
| Quantity selectors work | ✓ PASS |
| Home screen store grid unaffected | ✓ PASS |
| RTL layout correct on all screens | ✓ PASS |

---

## Before / After Screenshots

| Before | After |
|---|---|
| `/tmp/r7_current.png` — entire screen gold | `/tmp/fix_product.png` — proper layout |
| Giant "أضف إلى السلة" fills viewport | Bottom bar is ~140dp, body fills rest |

---

## APK Build

- **Build:** Release
- **Path:** `apps/customer_app/build/app/outputs/flutter-apk/app-release.apk`
- **Size:** 66.6MB
- **Installed on device:** R3CX207GH3L ✓

---

## Impact Assessment

- **Scope:** `product_detail_screen.dart` only — no other files changed
- **Risk:** Zero — only adds a `SizedBox` height constraint, no logic change
- **Breaking changes:** None
- **Backend/API:** Untouched
