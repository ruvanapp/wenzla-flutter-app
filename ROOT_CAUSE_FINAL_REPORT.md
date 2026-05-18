## ROOT CAUSE FINAL REPORT

### Scope completed
- Investigated production-safe visibility cause for merchant `الشركه`
- Did not modify production data blindly
- Did not rebuild, reinstall, or patch code

### What was verified

#### 1. Merchant status fields
Direct production DB/admin-row inspection is **not available** from the current environment, so I could not truthfully read non-schema fields from the live row.

Important schema fact:
- In the current backend schema, merchant only has:
  - `status`
  - `blockedReason`
- Fields requested like:
  - `customer_visible`
  - `deleted`
  - `hidden`
  - `published`
  - merchant-level `ACTIVE`
do **not exist** in the current Prisma schema.

Merchant status enum is:
- `PENDING`
- `APPROVED`
- `REJECTED`
- `BLOCKED`

#### 2. Is this merchant returned by `GET /customer/stores`?
**No.**

Live production response for:
- `GET https://wenzla-backend-production.up.railway.app/customer/stores`

returned approved stores like:
- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

but did **not** return:
- `الشركه`

#### 3. Products linked to merchant `الشركه`
Direct DB enumeration for all products of merchant `الشركه` is not available without authenticated admin/DB access.

But live production seller app evidence showed:
- seller store name: `الشركه`
- products tab count: `1 منتج`
- visible product:
  - `عسل افيون`
  - `550 ج.م`
  - `المخزون 9`
  - `ACTIVE`

So at least one product for `الشركه` is visible in seller app and marked:
- `status = ACTIVE`
- stock > 0

Requested product flags like:
- `hidden`
- `deleted`
- `published`
- `visibility`
- product-level `APPROVED`
also do **not exist** in the current Prisma schema.

Product status enum is only:
- `ACTIVE`
- `BLOCKED`

### 4. Exact backend filter condition preventing catalog appearance

#### Verified backend customer filter
In `backend/src/routes/customer.js`:

- `GET /customer/stores`
  - fetches merchants with:
    - `where: { status: "APPROVED" }`
  - includes only products with:
    - `where: { status: "ACTIVE" }`

- `GET /customer/stores/:id`
  - also requires:
    - merchant `status = APPROVED`
    - products `status = ACTIVE`

### Exact root cause
The production customer catalog omission is caused by the **backend public catalog query path**, not by the installed Play apps themselves.

The strongest verified root cause is:

- merchant `الشركه` is **not qualifying for `GET /customer/stores`**

Given the evidence, the exact failing condition must be one of:

1. merchant row for `الشركه` is **not actually `APPROVED` in production public-catalog data**, despite seller access, or
2. the seller app is reading a merchant profile that exists, while the public customer catalog dataset does not expose that merchant, or
3. there is a production data inconsistency between merchant/profile visibility and customer catalog listing

### Most likely precise explanation
Because seller app shows:
- store `الشركه`
- one product `عسل افيون`
- product status `ACTIVE`

while customer public API still omits the store entirely,
the most likely exact production root cause is:

- **merchant approval/catalog visibility data inconsistency on the backend**, not a customer app rendering issue

### 5. Safe backend-only fix?
Not safely applicable from the current environment.

Reason:
- no direct authenticated production admin API token / DB access was available here to inspect and patch the exact merchant row truthfully
- applying a guessed production fix would violate your safety constraint

### Safest minimal fix
Backend/data only:

1. inspect merchant row for store `الشركه` in production admin/DB
2. verify `merchant.status`
3. verify the product `عسل افيون` belongs to that exact merchant row
4. if merchant status is not `APPROVED`, set it to `APPROVED`
5. if product is attached to wrong merchant or blocked in DB, correct only that record
6. recheck:
   - `GET /customer/stores`
   - `GET /customer/stores/:id`

### 6. Post-fix verification
Not executed, because no safe direct production fix was reachable from this environment without authenticated admin/data access.

### Same production backend/database check
Verified from source defaults:
- customer app default API:
  - `https://wenzla-backend-production.up.railway.app`
- seller app default API:
  - `https://wenzla-backend-production.up.railway.app`

Installed apps are also Google Play installs:
- installer: `com.android.vending`

So there is **no evidence** that seller and customer are pointed to different backend hosts in production.

### Final classification
- **Primary issue type:** backend/data visibility inconsistency
- **Not primarily app-side**
- **Not primarily cache/indexing**
- **Not safely auto-fixable here without authenticated production admin/data access**

### Concise final answer
`الشركه` is missing from production customer catalog because it does **not satisfy the backend public-store listing path as currently stored in production data**, even though the seller profile remains accessible in the seller app.

This is a **backend/data visibility inconsistency**, and the safest fix is a **targeted production merchant/product row inspection and correction**, not a mobile app change.