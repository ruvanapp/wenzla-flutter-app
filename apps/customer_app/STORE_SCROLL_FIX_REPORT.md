# STORE PAGE SCROLL FIX REPORT

## Problem

The store detail page used a `TabBarView` inside `SliverFillRemaining`, which gave each tab a bounded fixed-height viewport. This caused:

- Products tab: `GridView.builder` scrolled independently inside the viewport
- Info tab: `ListView` scrolled independently inside the viewport
- Reviews tab: `ListView` scrolled independently inside the viewport

Users had to scroll the **header area** separately, then scroll the **products area** separately — two distinct scroll gestures for one logical page.

---

## Root Cause

```
BEFORE (broken):
CustomScrollView
  ├── SliverAppBar          ← scroll zone A
  ├── SliverToBoxAdapter    ← scroll zone A
  ├── SliverPersistentHeader (TabBar)
  └── SliverFillRemaining
        └── TabBarView
              ├── GridView  ← scroll zone B (independent!)
              ├── ListView  ← scroll zone B (independent!)
              └── ListView  ← scroll zone B (independent!)
```

`SliverFillRemaining` fills the remaining viewport height and gives `TabBarView` a fixed bounded space. Any `ScrollView` inside a bounded box becomes independently scrollable — this is the core Flutter constraint that causes the nested scroll conflict.

---

## Fix

Removed `SliverFillRemaining` + `TabBarView` entirely.

Replaced with **conditional inline slivers** that render directly into the parent `CustomScrollView`:

```
AFTER (fixed):
CustomScrollView (single scroll zone)
  ├── SliverAppBar
  ├── SliverToBoxAdapter (stats + description + WhatsApp + address)
  ├── SliverPersistentHeader (TabBar — pinned)
  ├── [if tab==0] SliverPadding → SliverGrid   ← no inner scroll
  │   [if tab==1] SliverPadding → SliverList   ← no inner scroll
  │   [if tab==2] SliverPadding → SliverList   ← no inner scroll
  └── SliverToBoxAdapter (bottom padding)
```

### How tab switching works

1. `TabController` is still used — the tab bar still shows the animated indicator.
2. `_tabs.addListener(_onTabChange)` — when the index changes, `setState(() => _selectedTab = _tabs.index)` rebuilds the sliver list.
3. Dart's `if` spread syntax (`if (_selectedTab == 0) ..._productSlivers(...)`) swaps the active slivers cleanly.
4. No `TabBarView` = no bounded viewport = no nested scroll.

### Key implementation choices

| Decision | Reason |
|----------|--------|
| `SliverGrid` for products | Lazy-loads product cards; no inner scroll |
| `SliverList` with `SliverChildBuilderDelegate` for info | Interleaved items+dividers without inner scroll |
| `SliverList` with `SliverChildListDelegate` for reviews | Reviews list is typically short; list delegate is fine |
| `BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics())` | Smooth cross-platform scroll with pull-to-refresh readiness |
| `_TabsDelegate.shouldRebuild` returns `old.tabs != tabs` | Prevents unnecessary rebuilds while still updating when controller changes |
| Tab listener via `addListener` + `removeListener` in `dispose` | Clean lifecycle management, no memory leaks |

---

## Files Changed

| File | Change |
|------|--------|
| `screens/store_detail/store_detail_screen.dart` | Full rewrite — removed `TabBarView`/`SliverFillRemaining`, added conditional inline slivers |

---

## Build Result

| Property | Value |
|----------|-------|
| Build mode | Release |
| APK | `apps/customer_app/build/app/outputs/flutter-apk/app-release.apk` |
| Size | 66.6 MB |
| Errors | 0 |
| Build time | ~111s |

---

## UX Behavior After Fix

| Action | Before | After |
|--------|--------|-------|
| Scroll from top of store page | Header scrolls, products stay | Entire page scrolls together |
| Scroll products section | Independent inner scroll | Same scroll momentum as rest of page |
| Tap tab | TabBarView swaps pane | Inline slivers rebuild; scroll position preserved |
| Long product list | Bottoms out at inner viewport | Extends full page height naturally |
| Small screen | Inner scroll cuts off products | Full grid visible via page scroll |
| RTL layout | Preserved | Preserved (`textDirection: TextDirection.rtl` on all Rows) |
| Android back button | Working | Working (via `PopScope` in `MainScreen`) |
