# DESIGN SYSTEM REPORT — سوق العسل Customer App v2

## Overview

Full premium design system overhaul applied to the customer app.  
Focus: richer/darker honey palette, visual consistency, premium components, better typography hierarchy.

---

## 1. Color System — Before vs After

| Token | Before | After | Change |
|-------|--------|-------|--------|
| `kHoney` | `#D4A437` (medium gold) | `#C08B22` (deep honey gold) | Richer, darker |
| `kAmber` | `#F0A500` (bright yellow) | `#D97706` (warm amber) | Less saturated |
| `kDarkHoney` | `#A87C1A` | `#9A6B14` | Deeper brown-gold |
| `kBackground` | `#FFF8EE` (very light ivory) | `#F5ECD8` (warm paper) | Richer warmth |
| `kSurfaceWarm` | `#FFF5DC` | `#FFF0D0` | Slightly deeper |
| `kBorder` | `#E5C888` | `#DFC890` | Tighter/richer |

### New Tokens Added

| Token | Value | Usage |
|-------|-------|-------|
| `kCaramel` | `#7A3E10` | Dark accent, pressed states |
| `kRoyal` | `#2C1204` | Deep surfaces, hero areas |
| `kTextBrown` | `#4A2A10` | Secondary text (was missing) |
| `kTextOnDark` | `#F5E8C8` | Text on dark/gradient surfaces |
| `kSurfaceDark` | `#1E0E02` | Snackbar, dark hero overlays |

### Gradient System

| Gradient | Colors | Usage |
|----------|--------|-------|
| `kGradientPrimary` | Gold → Deep caramel | Primary buttons, product badges |
| `kGradientDark` | Royal brown → Caramel | Hero sections, dark banners |
| `kGradientHeader` | Warm gold → Dark gold | Account header wave |
| `kGradientSurface` | Off-white → Warm ivory | Background sections |

### Shadow System (all `get` — dynamic)

| Shadow | Spread | Usage |
|--------|--------|-------|
| `kCardShadow` | Honey-tinted 12px blur | Store cards, product cards |
| `kLiftedShadow` | Honey-tinted 28px blur | Elevated feature cards |
| `kNavShadow` | Multi-layer, -6px offset | Bottom navigation |
| `kButtonShadow` | Honey 35% opacity, 16px | CTA buttons |

### Spacing & Radius System

```dart
kRadiusXS=6   kRadiusS=10  kRadiusM=14  kRadiusL=18  kRadiusXL=24  kRadiusXXL=32
kSpaceXS=4    kSpaceS=8    kSpaceM=12   kSpaceL=16   kSpaceXL=20   kSpaceXXL=28
```

---

## 2. Typography — Material 3 TextTheme

All weights and sizes standardized with `fontFamily: 'Cairo'`:

| Style | Weight | Size | Usage |
|-------|--------|------|-------|
| `displayLarge` | 800 | 28 | Hero headings |
| `headlineLarge` | 800 | 24 | Screen titles |
| `headlineMedium` | 700 | 20 | Section titles |
| `titleLarge` | 700 | 17 | Card titles |
| `titleMedium` | 600 | 15 | Subtitle/labels |
| `bodyLarge` | 400 | 15, h:1.6 | Product descriptions |
| `bodyMedium` | 400 | 14, h:1.5 | Standard text |
| `bodySmall` | 400 | 12, h:1.4 | Metadata/muted |
| `labelSmall` | 500 | 11 | Badges, chips |

---

## 3. Reusable Widget Library (widgets.dart)

### New Components

| Component | Description |
|-----------|-------------|
| `ShimmerBox` | Animated shimmer skeleton with warm honey gradient sweep |
| `SkeletonStoreCard` | Full store card skeleton with image + text placeholders |
| `SkeletonFeaturedCard` | Horizontal featured card skeleton |
| `FadeInWidget` | Fade + slide entrance animation, configurable delay/direction |
| `TapScaleWidget` | Press-scale feedback (0.93x) with spring animation |

### Upgraded Components

| Component | Improvement |
|-----------|-------------|
| `HoneyButton` | Added gradient option (gold→caramel), animated scale press, loading state |
| `HoneyCard` | Honey-tinted shadows, `elevated` variant with `kLiftedShadow` |
| `SectionTitle` | Premium left accent bar (3px gradient), subtitle support, "see all" pill button |
| `HoneyChip` | Configurable background/text color |
| `NetImage` | Shimmer loading state, borderRadius support, fallback emoji |
| `EmptyState` | Animated entrance (FadeIn), action button |
| `StoreLogoWidget` | Gradient fallback with initial letter, richer shadow |
| `QtySelector` | Animated switcher on count change |
| `OrderStatusChip` | Richer color palette, border ring |

### New Utility Components

| Component | Description |
|-----------|-------------|
| `TrustBadge` | Icon + label trust indicator (natural / certified / fast) |
| `PriceBadge` | Price + original price with strikethrough |
| `GradientIconBox` | Gradient background icon container with shadow |
| `InfoRow` | Labeled data row with icon (used in detail screens) |
| `SummaryRow` | Cart/checkout total row, bold variant |

---

## 4. Theme (app_theme.dart)

### NavigationBar
- `indicatorColor: kHoney.withOpacity(0.13)` — subtle warm indicator
- `indicatorShape: RoundedRectangleBorder(12)` — pill-shaped indicator
- Selected icons: `kHoney` tinted, `size: 24`
- Unselected icons: `kTextMuted`, `size: 22`
- Selected label: `kHoney`, `weight: 700`, `size: 11.5`
- Height: 64px (compact)

### Card Theme
- `elevation: 0` — all elevation via custom `boxShadow` tokens

### Button Theme
- `FilledButton`: `backgroundColor: kHoney`, `radius: kRadiusM`
- `OutlinedButton`: `kHoney` border + text, `radius: kRadiusM`

### Input Decoration
- Filled with `kSurface`
- Focused border: `kHoney` 1.8px
- Enabled border: `kBorder` 1.2px
- Radius: `kRadiusM`

### Bottom Sheet
- Background: `kBackground` (warm ivory, not cold white)
- Top radius: `kRadiusXL`

### Snackbar
- Background: `kSurfaceDark` (premium dark brown)
- Text: `kTextOnDark` (warm cream)

---

## 5. Changed Files

| File | Changes |
|------|---------|
| `theme/colors.dart` | Full rewrite — richer palette, gradients, shadows, spacing/radius tokens |
| `theme/app_theme.dart` | Full rewrite — Material 3 theme with honey ColorScheme |
| `widgets/widgets.dart` | Full rewrite — 20+ premium components |
| `screens/main_screen.dart` | Bottom nav: warm top border + `kNavShadow`, `kSurface` background |
| `screens/profile/account_header.dart` | Header gradient: richer dark gold `[#D4A437 → #A87820 → #7A4C0A]` |
| `screens/profile/account_section.dart` | Section title: accent bar + `kTextBrown` label |
| `screens/cart/cart_screen.dart` | Fixed stale `bottomIndex: 5→3`, `bottomIndex: 4→1` |
| `screens/orders/orders_screen.dart` | Fixed stale `bottomIndex: 5→3` |
| `screens/categories/categories_screen.dart` | Fixed removed `AppScreen.search` reference |

---

## 6. Navigation Fixes (from previous refactor)

All stale `bottomIndex` values corrected for the new 4-tab layout:

| Old Index | New Index | Tab |
|-----------|-----------|-----|
| 4 (orders) | 1 | طلباتي |
| 4 (categories) | — | Removed |
| 5 (login/account) | 3 | حسابي |

---

## 7. Build Result

| Property | Value |
|----------|-------|
| Build mode | Release |
| APK size | 66.6 MB |
| Build time | ~257s |
| Errors | 0 |
| Warnings | 0 (icons tree-shaken 99.4%) |

APK path: `apps/customer_app/build/app/outputs/flutter-apk/app-release.apk`

---

## 8. Visual Improvements Summary

### Home Screen
- Richer warm ivory background (`#F5ECD8` vs `#FFF8EE`)
- Deeper honey gold in all accents and icons
- SectionTitle with left accent bar instead of plain text
- Store card shadows with honey tint (honey@12% + black@4%)
- FadeIn animations on skeletons during loading

### Account/Profile Screen
- Header wave: richer dark gold gradient (less yellow, more premium)
- Section labels: accent bar + `kTextBrown` color (not muted gray)
- Card shadows: honey-tinted instead of generic gray

### Bottom Navigation
- Warm top border divider (`kBorder@35%`)
- `kNavShadow`: multi-layer honey+black shadow
- Background: `kSurface` (white, distinct from `kBackground`)

### Buttons
- `HoneyButton`: gold-to-caramel gradient + press shadow
- Animated press scale (0.96x)

### Typography
- All weights standardized — no mixed font sizes
- Letter spacing improved for Arabic headings

---

## 9. Design Direction

The app moved from:
- **Before**: Bright MVP yellow, generic white cards, flat shadows
- **After**: Deep honey gold, warm ivory paper, honey-tinted shadows, premium gradients, consistent Arabic spacing
