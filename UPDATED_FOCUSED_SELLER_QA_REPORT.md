# Updated Focused Seller QA Report

## Scope
Production-style focused seller QA on connected physical Android device after seller phone normalization update, using existing seeded staging merchant and manual human login.

## Device / Environment
- Device: Samsung Galaxy S24 Ultra (`SM-S928B`)
- Android: 16
- Backend: staging only
- App: `com.wenzla.merchant`
- Seeded seller used: `+20100000002` / `test123` (`TEST_Store 2`)

## Fixes under regression verification
- Auth fields start empty
- Seller phone normalization happens only at request layer
- Existing seeded seller auth should remain compatible

## Authentication regression result
### PASS
- Manual human login on the real device succeeded.
- Post-login seller screen was visible and authenticated.
- Evidence captured after manual login:
  - seller app remained foregrounded
  - authenticated sales/dashboard screen visible
  - store status visible as `APPROVED`
- This truthfully verifies the normalization change did **not** break existing seeded seller authentication.

## Dashboard rendering
### PASS
- Dashboard/sales view rendered on device after authenticated login.
- Visible content included:
  - `حالة المتجر: APPROVED`
  - sales/commission summary cards
  - `المنتجات`, `قيد الانتظار`, `المبيعات`, `العمولة`
- No crash on entering dashboard.

### Observation
- Dashboard counts on the visible screen showed `0` despite seeded backend data existing for this merchant.
- This suggests dashboard summary data may not match seeded backend expectations, or the dashboard metrics query excludes current seeded data.
- Functional rendering passed, but displayed numbers appear suspicious.

## Products CRUD
### PARTIAL / FAIL
- Products tab is reachable and rendered correctly.
- Product form fields are visible:
  - product name
  - description
  - stock
  - price
  - weight
  - image URL
  - image upload button
  - add product button
- However, the screen still showed:
  - `0 منتج`
  - `لا توجد منتجات بعد. أضف أول منتج بالأعلى.`
- Backend staging data for `TEST_Store 2` contains **2 products**, so device UI did not reflect current seeded product data.
- Full CRUD cannot be honestly signed off because existing product rendering already appears inconsistent.

## Image upload
### NOT COMPLETED
- Image upload button is visible: `اختيار ورفع صورة المنتج`
- Full end-to-end image selection/upload was not completed in this final pass.
- Not signed off.

## Orders flow / status update
### FAIL / INCONSISTENT
- Orders tab is reachable and renders.
- But in this final post-manual-login pass it showed:
  - `الطلبات المباشرة 0 طلب`
  - `لا توجد طلبات بعد...`
- Backend staging for this merchant still shows 3 orders:
  - one `CANCELLED`
  - one `PENDING`
  - one `ACCEPTED`
- Because UI and backend data disagree, truthful order status update verification cannot be signed off from this run.

## Logout / session persistence
### PARTIAL PASS
- Session persistence previously passed in earlier real-device QA steps.
- In this focused manual-login regression pass, app remained authenticated after login and app stayed stable while navigating tabs.
- Explicit logout action was **not** completed in this final pass.
- So logout remains **not fully signed off**.

## Stability / runtime
### PASS
- No seller-app crash or ANR observed during:
  - manual login success
  - dashboard render
  - tab navigation to products/orders
  - recent-app reopen sequence
- App remained foreground stable.

## Truthful major findings
1. **Normalization regression: PASS**
   - Manual seeded seller login succeeded after normalization change.
   - Existing seller authentication compatibility preserved.

2. **Data rendering inconsistency: FAIL**
   - Backend has seeded products/orders for `TEST_Store 2`
   - Device UI shows zero products / zero orders in final focused pass
   - This is now the main blocker, not authentication.

## Evidence artifacts
- `/tmp/manual_login_ready.png`
- `/tmp/seller_post_manual_login.png`
- `/tmp/seller_products_tab.png`
- `/tmp/seller_orders_tab.png`
- `/tmp/seller_order_detail.png`
- `/tmp/seller_recents.png`

## Final verdict
- **Authentication regression after phone normalization: PASSED**
- **Full seller production-style QA: NOT PASSED** due to data-rendering inconsistencies
- Remaining blockers are now focused on:
  1. products list not reflecting seeded backend products
  2. orders list not reflecting seeded backend orders in final pass
  3. image upload not fully proven
  4. logout not fully proven
