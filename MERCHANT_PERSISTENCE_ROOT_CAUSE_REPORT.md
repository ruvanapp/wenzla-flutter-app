## Merchant Persistence Root Cause Report

### Scope
- Deep audit of merchant creation/write flow only
- Read-first investigation completed
- No frontend changes
- No rebuilds
- No blind fixes applied

## Final root cause

There is **no merchant persistence failure** in the production backend create path.

The merchant creation flow is successfully:
- accepting the API request
- creating the `User` row
- creating the nested `Merchant` row
- committing both rows to the production database

### Exact real failure
The real failing condition is:

- newly created merchants are persisted with `merchant.status = PENDING`
- `GET /customer/stores` only returns merchants with `status = APPROVED`

So new merchants do not appear in the customer production catalog **because they are intentionally excluded by the approval gate**, not because creation fails or rows disappear.

## Step-by-step trace of the merchant creation flow

### 1. Seller app registration call
In `apps/merchant_app/lib/main.dart`:
- `register()` calls:
  - `POST /auth/merchant/register`
- then immediately:
  - `applyAuth(data)`
  - `refreshAll()`

This means the seller app can enter an authenticated merchant session immediately after registration using the API response payload.

### 2. Backend create route
In `backend/src/routes/auth.js`:

`POST /auth/merchant/register`

Code path:
- validate body with `merchantLoginSchema`
- check existing user by phone
- hash password
- create user with nested merchant:
  - `role: "MERCHANT"`
  - `merchant.create({ storeName: ... })`
- return auth response with embedded merchant object

### 3. Prisma create call
Exact persistence call:

- `prisma.user.create({ data: { ..., merchant: { create: { storeName: ... }}} , include: { merchant: true } })`

This is a nested Prisma write.
If nested merchant creation failed, the whole user create would fail and no success response would be returned.

### 4. Silent failure / rollback audit

Findings:
- no surrounding `try/catch` in merchant register route
- no silent swallow around `prisma.user.create`
- no custom transaction rollback path
- no background job involved in merchant row creation

Therefore:
- a successful HTTP `201` from `/auth/merchant/register` means the nested user + merchant create committed

## Reproduction performed on production backend

### Test merchant created

- Phone: `+201111110909`
- Store name: `QA_PROD_TRACE_20260515`

### API result

`POST /auth/merchant/register`

Returned:
- HTTP `201`
- user object
- embedded merchant object
- merchant status = `PENDING`

### Immediate production DB verification

Direct production DB query confirmed:
- merchant row exists
- user row exists
- merchant persisted successfully

Exact persisted row:
- `storeName = QA_PROD_TRACE_20260515`
- `status = PENDING`

Merchant count changed:
- before create: `4`
- after create: `5`

This proves merchant rows are actually committed into the production DB.

## Why seller app can show the merchant immediately

Seller app behavior is not fake cache-only state.

Why it appears immediately:
- backend register response already includes the new merchant object
- seller app stores that response in local state with `applyAuth(data)`
- seller app then loads merchant endpoints using the returned token

So the merchant can be visible in seller flow immediately even while still `PENDING`.

This is expected from current backend/app behavior.

## Why customer app never shows the new merchant

In `backend/src/routes/customer.js`:

`GET /customer/stores`
- filter: `where: { status: "APPROVED" }`

`GET /customer/stores/:id`
- filter: `where: { id: req.params.id, status: "APPROVED" }`

`POST /customer/orders`
- merchant check: `where: { id: data.merchantId, status: "APPROVED" }`

So a newly registered merchant with status `PENDING` is excluded from:
- store list
- store detail
- checkout

## Exact failing layer

| Layer | Result |
|---|---|
| API create route | PASS |
| Prisma nested create | PASS |
| Transaction/commit | PASS |
| Production DB write | PASS |
| Seller app local/session state | PASS / expected |
| Customer catalog visibility | FAIL by design for `PENDING` merchants |
| Approval workflow | Missing / incomplete for new merchant onboarding |

## Exact failing code path

### Create path works
`backend/src/routes/auth.js`
- `POST /merchant/register`
- nested `merchant.create(...)`

### Visibility path blocks new merchants
`backend/src/routes/customer.js`
- `GET /stores`
- `GET /stores/:id`
- `POST /orders`

All require:
- `merchant.status = "APPROVED"`

### Missing operational step
New merchants are being created, but they are not being transitioned to:
- `APPROVED`

through the production approval/admin process.

## Unique constraints / validation findings

### Validation
- `phone`: min/max length validated
- `password`: min 6
- `storeName`: optional, min 2 if provided

### Unique constraint
- user uniqueness enforced by:
  - `User.phone @unique`
- create route pre-checks existing user by phone

No evidence found that uniqueness or validation is causing silent merchant loss.

## Concise final conclusion

The production bug is **not merchant persistence failure**.

The exact root cause is:

- merchant creation **persists successfully**
- but newly created merchants remain **`PENDING`**
- and production customer catalog only exposes **`APPROVED`** merchants

## Safest fix direction

Backend/data/process only:
- ensure legitimate new merchants are explicitly approved in production
- or introduce a controlled approval workflow/action that moves valid merchants from `PENDING` to `APPROVED`

No frontend rebuild is required for that.