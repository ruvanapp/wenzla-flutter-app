# Seller Data Rendering Debug Report

## Scope
Focused real-device debugging for seller products/orders rendering mismatch after authentication.

## Root cause
The previous zero-products/zero-orders UI was caused by logging into the wrong merchant account (`الشركه`), not a frontend rendering/state bug.

Seller APIs scope data by authenticated user identity (`req.user.id` -> merchant by `userId`), so the app correctly showed zero data for the wrong merchant.

## Verified merchant scope
Correct seeded merchant session after manual login:
- Store: `TEST_Store 2`
- Phone: `+20100000002`
- Status: `APPROVED`

## Real-device parity verification
### Dashboard
Real device showed:
- `TEST_Store 2`
- `2 المنتجات`
- `1 قيد الانتظار`
- `0 الطلبات المكتملة`
- `0 ج.م المبيعات`
- `0 ج.م العمولة`

### Orders tab
Real device showed:
- `الطلبات المباشرة`
- `3 طلب`
- `Test Customer 1` / `75 ج.م`
- `Test Customer 3` / `525 ج.م`
- `Test Customer 2` / `150 ج.م`

### Products tab
Real device showed:
- `إضافة منتج`
- `2 منتج`
- `TEST_Nuts Mix`
- `TEST_Organic Coffee`

## Conclusion
- Auth normalization works
- Authenticated seller identity mapping works
- Merchant scoping works
- Products/orders rendering parity is now confirmed on the connected real Android device for `TEST_Store 2`
- No frontend parsing/state-assignment fix was required
- No backend change was required

## Evidence artifacts
- `/tmp/seeded_session_current.png`
- `/tmp/seeded_orders_tab.png`
- `/tmp/seeded_products_tab.png`
