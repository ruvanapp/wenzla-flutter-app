# ROOT CAUSE REPORT

## Exact root cause

Merchant store **`الشركه`** is login-accessible in the seller production app because the seller app loads the merchant profile directly by authenticated `userId`.

But the same store is **not visible in the customer production app** because the customer store-list API only returns merchants that satisfy:

- merchant `status = APPROVED`
- and the customer app only meaningfully surfaces stores with active products

The live production `GET /customer/stores` response does **not** include `الشركه` at all, while it does include other approved stores like:

- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

So the problem is in the **production backend data/visibility path**, not in basic seller authentication.

## Affected API / data path

### Customer visibility path
File:
- `backend/src/routes/customer.js`

Relevant path:
- `GET /customer/stores`

Current filter:
- merchant must be `APPROVED`
- included products are filtered by `status = ACTIVE`

### Seller visibility path
File:
- `backend/src/routes/merchant.js`

Relevant path:
- authenticated seller profile / merchant data is loaded by `userId`

This means a merchant can exist and be accessible in seller app even if it is not appearing in the customer public catalog list.

## What was verified

1. **Store publish/active flags**
- Customer API only exposes merchants where `status = APPROVED`
- Seller app also requires merchant `status = APPROVED`
- Since seller login succeeds into `الشركه`, the merchant itself is likely approved in seller flow

2. **Customer API visibility filters**
- Confirmed in `backend/src/routes/customer.js`
- `GET /customer/stores` uses:
  - `where: { status: "APPROVED" }`
  - includes only products with `status: "ACTIVE"`

3. **Production backend merchant sync**
- No evidence from this check that the issue is caused by Odoo sync itself
- The missing store is already absent at the raw customer API layer

4. **Category/product requirements**
- Customer API does **not** require category presence
- It does require products to be `ACTIVE` to be included in the store payload
- If `الشركه` has zero active products, it can become effectively invisible in customer UI even if merchant exists

5. **Hidden/unapproved merchant state**
- Strong candidate
- Exact merchant row for `الشركه` was not directly queried here, but the store missing from `/customer/stores` while seller can access it indicates either:
  - merchant/customer-facing row mismatch, or
  - no qualifying customer-visible product data

6. **Cache/indexing issues**
- Unlikely primary cause
- Raw production `/customer/stores` response itself does not include `الشركه`
- So this is not just a client cache/render issue

7. **Same production backend/database check**
- Both production app source defaults point to:
  - `https://wenzla-backend-production.up.railway.app`
- Customer Play app package/install state is production Play
- Seller Play app package/install state is production Play
- Current investigation treated both as production-facing

## Safest fix

Safest fix is **backend/data-side first**, not mobile-side:

1. inspect the production merchant row for store `الشركه`
2. verify:
   - merchant status
   - linked `userId`
   - whether it has at least one product with `status = ACTIVE`
   - whether product stock/content makes it renderable in customer UI
3. if merchant is approved but has no active customer-visible products:
   - activate/publish at least one valid product for that merchant
4. if merchant status/customer visibility state is inconsistent:
   - correct the merchant record in backend/admin data only

Do **not** patch the customer app first, because the raw customer API already omits the store.

## Backend-only or app-side?

### Primary classification
- **Backend/data visibility issue**

### Why
- Seller app can access merchant account directly
- Customer app depends on public catalog API
- Raw production `/customer/stores` response does not contain `الشركه`

### App-side status
- Customer app may also have a UX limitation if it hides stores with empty product lists too aggressively
- But for this issue, the **root cause is not primarily app-side**

## Concise conclusion

`الشركه` is missing from the **production customer catalog API path**, while the seller app can still access it through authenticated merchant profile lookup.

Most likely safe root cause:
- **merchant/customer visibility data mismatch** or
- **no qualifying ACTIVE customer-visible products for that merchant**

This is best treated as a **backend/data visibility issue**, not a production mobile build mismatch.