# PRODUCTION CATALOG ROOT FIX REPORT

## Scope
- Investigated production customer catalog pipeline end-to-end
- No rebuilds, no reinstalls, no code changes
- No blind production data modification

## What was verified

### 1. `GET /customer/stores` live production result
Live production API:

- `https://wenzla-backend-production.up.railway.app/customer/stores`

Current result:
- returns exactly `4` stores
- all returned stores have `status = APPROVED`
- returned stores are:
  - `مناحل البنا`
  - `مناحل الهدي`
  - `مناحل الصفا`
  - `مناحل القناوي`

Missing from live production response:
- `الشركه`
- newly created merchant reported by user

So the omission is present in the raw production API itself, before customer UI rendering.

## 2. Prisma query / join logic

From `backend/src/routes/customer.js`:

### `GET /customer/stores`
- queries `prisma.merchant.findMany`
- filter:
  - `where: { status: "APPROVED" }`
- includes:
  - `products: { where: { status: "ACTIVE" }, take: 6 }`
  - `reviews: true`

### `GET /customer/stores/:id`
- filter:
  - `where: { id: req.params.id, status: "APPROVED" }`
- includes:
  - products only where `status = ACTIVE`

### `GET /customer/products/search`
- filter:
  - product `status = ACTIVE`
  - merchant `status = APPROVED`

There is:
- no pagination in `/customer/stores`
- no offset/limit bug there
- no app-side filtering of stores with empty products in the main store list

## 3. Customer app rendering logic

From `apps/customer_app/lib/main.dart`:

- `loadStores()` directly assigns the full `/customer/stores` response to `stores`
- home view renders:
  - `...stores.map((store) => storeCard(store))`
- there is no extra customer-side filtering removing merchants

So the customer production app is showing exactly what `/customer/stores` returns.

## 4. Seller app behavior

Seller production app is using the same default API host:
- `https://wenzla-backend-production.up.railway.app`

Seller app loads merchant data via authenticated endpoints:
- `/merchant/profile`
- `/merchant/products`
- `/merchant/orders`

This is a different access path from the public customer catalog.

Verified live seller production UI for `الشركه`:
- store visible in seller app
- one product visible
- product shown as:
  - `عسل افيون`
  - `550 ج.م`
  - `المخزون 9`
  - `ACTIVE`

## 5. Production DB / environment mismatch check

Both source defaults point to the same production backend host:
- customer app default API = production Railway backend
- seller app default API = production Railway backend

Play-installed packages verified:
- `com.wenzla.customer`
- `com.wenzla.merchant`
- installer: `com.android.vending`

No evidence was found that seller app and customer app are pointed at different backend hosts.

## 6. Merchant/product relation findings

Schema facts from `backend/prisma/schema.prisma`:

### Merchant
- relevant visibility field is only:
  - `status`
- enum:
  - `PENDING`
  - `APPROVED`
  - `REJECTED`
  - `BLOCKED`

### Product
- relevant visibility field is only:
  - `status`
- enum:
  - `ACTIVE`
  - `BLOCKED`

Fields such as:
- `published`
- `hidden`
- `deleted`
- `customer_visible`
- merchant-level `ACTIVE`

do **not exist** in the current schema.

## 7. Exact root cause

This is **not** a pagination bug and **not** a customer app rendering bug.

The exact failing pipeline is:

1. customer app requests `/customer/stores`
2. backend only returns merchants where `merchant.status = APPROVED`
3. affected merchants are not being returned by that production query

At the same time:
- seller app can still access merchant profile/products through authenticated merchant endpoints

### Therefore the root cause is:
- **production backend/data inconsistency in public catalog eligibility**

Most likely exact backend data condition:
- affected merchant rows are **not qualifying as `APPROVED` in the production public catalog query path**
- even though the seller account can still access merchant endpoints and products

This is consistent with:
- multiple merchants affected
- newly created merchant also missing
- raw `/customer/stores` already incomplete

## 8. Is there a safe minimal backend-only production fix available here?

**Not from this environment safely.**

Reason:
- no authenticated production admin/DB write access was available in this session
- the safe fix requires inspecting and correcting actual production merchant rows
- guessing and patching code would be unsafe because:
  - current query logic is straightforward
  - issue appears to be production data state, not code complexity

## 9. Safest minimal fix

Backend/data only:

1. inspect production merchant rows for missing stores
2. verify `merchant.status`
3. verify merchant row linked to seller `userId`
4. set affected merchant rows to `APPROVED` if they are incorrectly stuck in another state
5. recheck `/customer/stores`
6. verify customer app shows the restored merchants

If a newly created merchant is expected to be public immediately, then the backend/admin process must ensure approval actually occurs on the real production row.

## 10. Why this is not primarily an app issue

- customer app renders raw `/customer/stores` output directly
- seller app and customer app both point to production host
- `/customer/stores` already omits affected merchants at the API level

## Final conclusion

The production customer catalog outage is caused by a **backend production data-state problem in merchant public eligibility**, not by Play app binaries, pagination, or customer UI filtering.

### True classification
- backend/data issue

### Minimal safe fix
- inspect and correct production merchant `status` values on the real rows

### Not safely applied here
- because direct authenticated production admin/database write access was not available in this environment

## Direct production DB inspection update

I was able to access the real production Railway backend environment and query the production database directly.

### Production backend / DB verified
- Railway environment: `production`
- Railway public domain: `wenzla-backend-production.up.railway.app`
- Active production `DATABASE_URL` host:
  - `shortline.proxy.rlwy.net:38672/railway`

### Exact production merchant rows found
The production DB currently contains only **4 merchant rows total**:

- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

All 4 have:
- `merchant.status = APPROVED`

Active product counts found in production DB:
- `مناحل البنا` → `0`
- `مناحل الهدي` → `1`
- `مناحل الصفا` → `1`
- `مناحل القناوي` → `6`

### Critical finding
The allegedly “hidden” production merchants such as:
- `الشركه`
- newly created merchant(s)

do **not exist at all** in the production merchant table currently queried by the production backend.

This means:
- `/customer/stores` is **not filtering out existing new merchants**
- the public catalog query is returning the full set of approved merchants that exist in this production DB
- there is **no pagination bug removing them**
- there is **no product join bug removing them**

## Exact root cause after DB inspection

The real production root cause is:

- **the merchant rows are absent from the production database behind `GET /customer/stores`**

Therefore the missing merchants cannot appear in the customer catalog, because they are not present in the DB that powers the production backend.

## What this rules out

Direct production DB inspection rules out:
- customer app rendering bug
- `/customer/stores` pagination bug
- merchant/product Prisma join bug for existing rows
- ACTIVE/APPROVED filter removing valid existing new merchants

## What this strongly suggests

One of these is true:

1. the “new merchants” were never actually created in this production DB, or
2. the seller-side flow that appeared to show them was using stale in-memory/session state, or
3. the seller flow previously observed was pointed at a different backend/database than the production DB now queried

### Supporting live evidence
- After force-stopping and cold-reopening the seller Play app, it returned to the login screen
- So the earlier visible seller state was not durable persisted proof of a current production merchant row

## Safe backend-only fix status

No code/query fix was applied, because the catalog query itself is behaving correctly against the current production DB contents.

### Why no code fix was appropriate
- there are no hidden merchant rows in production to “unfilter”
- changing `/customer/stores` logic would not create missing merchant rows
- the issue is upstream of catalog query execution

## Safest next backend action

1. audit the merchant creation / approval path that was expected to create the missing production merchants
2. confirm which backend/database that flow actually wrote to
3. verify whether merchant creation happened on:
   - staging instead of production
   - another backend instance
   - an unpersisted seller app session only
4. once the real merchant rows exist in the actual production DB with `status = APPROVED`, they should appear in `/customer/stores` without app updates

## Final corrected classification

- **Not a frontend problem**
- **Not a Play Store build problem**
- **Not a catalog query bug**
- **Primary issue: production merchant records are missing from the production DB used by `/customer/stores`**