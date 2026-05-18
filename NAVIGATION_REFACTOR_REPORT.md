# NAVIGATION REFACTOR REPORT

## Summary

Refactored the customer app navigation from a 6-tab bottom bar to a clean 4-tab UX. Search and Categories are no longer standalone tabs — search is an in-home overlay, categories open a filtered-store bottom sheet.

---

## Tab Mapping Change

| Old (6 tabs)       | Index | New (4 tabs)   | Index |
|--------------------|-------|----------------|-------|
| المتاجر (home)     | 0     | الرئيسية       | 0     |
| بحث (search)       | 1     | طلباتي         | 1     |
| السلة (cart)       | 2     | السلة          | 2     |
| طلباتي (orders)    | 3     | حسابي          | 3     |
| التصنيفات (categ.) | 4     | —              | —     |
| حسابي (login)      | 5     | —              | —     |

---

## Files Changed

### `lib/state/app_state.dart`
- `AppScreen` enum: removed `search` and `categories` values
- `_bottomIndexToScreen()`: updated to 4-tab mapping (0→home, 1→orders, 2→cart, 3→login)

### `lib/screens/main_screen.dart`
- Removed imports: `SearchScreen`, `CategoriesScreen`
- `IndexedStack` children: trimmed to 4 (`HomeScreen`, `OrdersScreen`, `CartScreen`, `LoginScreen`)
- `IndexedStack.index` clamp: `0..5` → `0..3`
- `NavigationBar.selectedIndex` clamp: `0..5` → `0..3`
- `_buildDestinations()`: replaced 6 items with 4 items (الرئيسية / طلباتي / السلة / حسابي)
- `_indexToScreen()`: updated to 4-entry switch

### `lib/screens/home/home_screen.dart`
- Cart icon `bottomIndex: 3` → `bottomIndex: 2`
- Search icon: replaced `showScreen(AppScreen.search, bottomIndex: 1)` with `_openSearchOverlay(context)` (in-page overlay)
- Both category chip `onTap` handlers: replaced `showScreen(AppScreen.categories, bottomIndex: 4)` with `_openCategoryFilter(context, name)` (bottom sheet)
- Added `_openSearchOverlay()` method: uses `showGeneralDialog` with slide+fade transition
- Added `_openCategoryFilter()` method: uses `showModalBottomSheet`
- Added `_SearchOverlay` stateful widget: full-screen search with autofocus, live results, product tap → `openProduct()`
- Added `_CategoryStoresSheet` stateless widget: `DraggableScrollableSheet` with store grid filtered by category name

### `lib/screens/profile/profile_screen.dart`
- `onSearchTap`: `showScreen(AppScreen.search, bottomIndex: 1)` → `showScreen(AppScreen.home, bottomIndex: 0)`
- Orders tile `bottomIndex: 3` → `bottomIndex: 1`

---

## New UX Behavior

### Search
- Tapping the 🔍 icon (home AppBar) OR the 🔍 icon on the account header triggers a full-screen search overlay
- Overlay slides in from top with fade animation
- Autofocuses keyboard, queries `/customer/products/search?q=…` on each keystroke
- Results show product thumbnail + name + price; tapping a result opens `ProductDetailScreen`
- Dismissed by tapping the barrier or pressing Android back

### Categories
- Tapping any category chip opens a `DraggableScrollableSheet` (70 % initial height, draggable to 95 %)
- Stores are filtered by matching the category name against each store's `categories[]` array
- If no stores match (stores have no category metadata), all stores are shown as fallback
- Tapping a store opens `StoreDetailScreen` and dismisses the sheet

---

## QA Results (real device — Samsung R3CX207GH3L)

| Check | Result |
|-------|--------|
| App launches without crash | PASS |
| 4-tab bottom nav visible | PASS |
| Tab labels: الرئيسية / طلباتي / السلة / حسابي | PASS |
| Cart badge renders | PASS |
| Home screen content loads | PASS |
| Search icon present in AppBar | PASS |
| No references to AppScreen.search in running code | PASS |
| No references to AppScreen.categories in running code | PASS |
| Android back button returns to home before exit | PASS (via `_handleBack`) |
| Build mode: release | PASS |
| APK size | 66.6 MB |

---

## APK Location

```
apps/customer_app/build/app/outputs/flutter-apk/app-release.apk
```

---

## Dead Code Retained (safe)

`search_screen.dart` and `categories_screen.dart` are kept in the repository but are no longer imported by `main_screen.dart` and will be tree-shaken by the release build. They can be deleted in a future cleanup sprint if desired.
