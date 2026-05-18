# سوق العسل — Performance Report
**Version:** 1.0.7+9  
**Date:** 2026-05-18

---

## Image Loading & Memory

### Before
- `Image.network(url, width: w, height: h)` — Flutter decodes image at **full original resolution**
- A 2000×2000px image loaded into a 100×100dp widget still used ~16MB RAM
- No explicit cache size hint → Flutter's image cache fills with full-resolution copies

### After
```dart
cacheWidth:  (width  * 2).toInt(),   // 2× for high-DPI (xxhdpi)
cacheHeight: (height * 2).toInt(),
```
- Images decoded at display size × density scale
- Estimated **4–8× memory reduction** for product images
- Full-page scroll of 10 product cards: ~2MB vs ~16MB previously

---

## Build Size Optimization

| Asset             | Before    | After     | Reduction |
|-------------------|-----------|-----------|-----------|
| MaterialIcons     | 1.6 MB    | 9.4 KB    | 99.4%     |
| Total APK         | ~38 MB    | 34.1 MB   | 10%       |

---

## Startup Performance
- Release mode cold start: ~1.5–2s (typical for Flutter release)
- No heavy initialization on main thread
- Firebase init deferred until after first frame

---

## Scroll Performance
- All list views use `ListView.builder` / `SliverList` — lazy rendering
- Store products grid uses `SliverGrid` with `childAspectRatio` constraints
- No nested `SingleChildScrollView` conflicts (fixed in store_detail_screen)
- `RepaintBoundary` is automatically applied by Flutter at component boundaries

---

## State Management Efficiency
- `AppState` uses `ChangeNotifier` — acceptable for app size
- Major network calls now use `try/finally` blocks → no stuck loading states
- Cart is persisted to `SharedPreferences` on every write

---

## Network Resilience (New)

| Method | Was | Now |
|--------|-----|-----|
| `checkout()` | Unguarded | try-catch; loading always resets |
| `loadOrders()` | Unguarded | try/finally |
| `loadStores()` | Unguarded | try/finally |
| `openStore()` | Unguarded | try/finally |
| `sendOtp()` | Unguarded | try-catch returns false |
| `verifyOtp()` | Unguarded | try-catch returns false |
| `search()` | Unguarded | try/finally |
| `submitReview()` | Unguarded | try-catch |
| `updateFcmToken()` | Unguarded | try-catch |

---

## Recommendations for Future Optimization

1. **Add `cached_network_image` package** — persistent disk cache prevents re-download
2. **Upgrade `withOpacity` → `withValues`** — 56 occurrences; cosmetic but shows deprecation warnings
3. **Use `context.select` in hot rebuild paths** — HomeScreen rebuilds on ALL AppState changes
4. **Add HTTP response caching** — cache store list/categories for 5 minutes
