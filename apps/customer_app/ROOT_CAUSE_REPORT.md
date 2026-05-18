# ROOT CAUSE REPORT — Giant Gold Panel Bug

**Date:** 2026-05-18  
**App:** سوق العسل Customer App  
**Bug:** Product detail screen renders as a full-screen gold panel showing only "أضف إلى السلة" + total price

---

## Bug Description

After opening any product detail screen, the entire viewport filled with a giant amber/gold rectangle containing only the "أضف إلى السلة" button text centered and a price strip on the right. The product image, title, description, and quantity selector were invisible.

**Screenshots:** `/tmp/r6_cart_multi.png`, `/tmp/r7_current.png`

---

## Root Cause

### Flutter Layout Constraint Chain

The bug lived entirely in the **`bottomNavigationBar`** of `product_detail_screen.dart`.

```
Scaffold.bottomNavigationBar
└── Container (no explicit height)
    └── SafeArea (top: false)
        └── Row (crossAxisAlignment: CrossAxisAlignment.center — default)
            ├── Column (mainAxisSize: min) — ~57dp tall  ← non-flex
            ├── SizedBox(width: 16)                       ← non-flex
            └── Expanded(child: HoneyButton(...))         ← flex child
```

**Step-by-step breakdown:**

1. `Scaffold` measures `bottomNavigationBar` with loose height constraints: `BoxConstraints(maxHeight ≈ 811dp)` (full screen height minus status bar).

2. `Container` (no explicit height) passes these loose constraints through to `SafeArea`.

3. `SafeArea` subtracts the bottom system inset (~48dp) and passes `maxHeight ≈ 763dp` to `Row`.

4. Flutter's `Row` layout (horizontal Flex) gives **flex children** (`Expanded`) `BoxConstraints(minHeight: 0, maxHeight: 763dp)` — the full parent max height — regardless of `crossAxisAlignment` (for any value except `stretch`).

5. `HoneyButton` (with `fullWidth: true`) returns `SizedBox(width: ∞, child: Container(padding: v15, child: Center(content)))`.

6. **Critical:** `Center` (an `Align` with `widthFactor: null, heightFactor: null`) given **bounded** `maxHeight = 733dp` (after subtracting padding) expands to fill `733dp`.

   From Flutter source `RenderPositionedBox.performLayout()`:
   ```dart
   final bool shrinkWrapHeight =
       (_heightFactor != null) || (constraints.maxHeight == double.infinity);
   // maxHeight = 733dp → NOT infinity → shrinkWrapHeight = false
   // Therefore: size.height = constraints.maxHeight = 733dp  ← EXPANDS!
   ```

7. `Container` height = 733 + 30 (padding) = 763dp.

8. Row height = max(Column ~57dp, HoneyButton ~763dp) = **763dp**.

9. `SafeArea` height = 763 + 48 = 811dp.

10. `Container` height = 811 + 32 = **843dp ≈ full screen height**.

**Result:** The `bottomNavigationBar` consumed the entire screen. The Scaffold's `body` (the `CustomScrollView` with product image, title, etc.) was pushed to 0px and rendered invisibly behind the bottom bar.

---

## Why It Seemed Like a "Product Card" Bug

The visual result — a giant gold rectangle with "أضف إلى السلة" centered — looked like a broken product grid card, but was actually the product detail screen's `bottomNavigationBar` expanded to fill the full viewport.

---

## Affected File

```
apps/customer_app/lib/screens/product_detail/product_detail_screen.dart
```

Line ~255: the `Expanded(child: HoneyButton(...))` inside the `bottomNavigationBar` Row.

---

## Why Other `HoneyButton` Uses Were Fine

All other `HoneyButton` usages (cart checkout button, store review button, etc.) appear in `Column` or `ListView` contexts with explicitly bounded height constraints. Only the `Expanded`-in-Row inside an unconstrained `bottomNavigationBar` triggered the expansion path in `Center`.
