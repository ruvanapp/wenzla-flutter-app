## Single Merchant Trace Report

### Input traced
- Seller phone provided: `01150100555`
- Seller password provided: `100100`

## 1. Exact production DB row for this seller phone

Direct production DB lookup for:
- `01150100555`
- `+201150100555`
- `201150100555`
- `1150100555`

### Result
No merchant row exists for this seller identity in production.

Rows found:

#### Phone `01150100555`
- user exists
- role = `CUSTOMER`
- name = `Demo Customer`
- merchant = `null`

#### Phone `+201150100555`
- user exists
- role = `CUSTOMER`
- merchant = `null`

#### Other normalized variants
- no rows

## 2. merchant.id

For the provided seller identity:
- **no merchant.id exists in production DB**

## 3. merchant.status

For the provided seller identity:
- **no merchant row exists**
- therefore no merchant status exists

## 4. createdAt / updatedAt

Production DB rows found for the provided phone belong to customer users only:

### `01150100555`
- role: `CUSTOMER`
- createdAt: `2026-05-06T00:25:50.297Z`
- updatedAt: `2026-05-06T00:25:50.297Z`

### `+201150100555`
- role: `CUSTOMER`
- createdAt: `2026-05-14T00:36:52.908Z`
- updatedAt: `2026-05-14T00:36:53.418Z`

## 5. Is seller app reading stale cached state?

### Strong evidence: yes

Live seller device UI currently displays:
- store name: `الشركه`
- merchant state: `APPROVED`
- products count: `1`

But production DB contains no merchant row matching the provided seller phone at all.

That means the visible seller app state is **not mapped to the provided phone identity in the current production DB**.

## 6. Did approval happen in another environment?

For the provided seller phone:
- no merchant row exists in current production DB
- staging direct lookup was not reachable from local Prisma using Railway internal host

So from current verified evidence:
- approval for this provided phone did **not** happen on the production merchant row set currently backing the API
- it may have happened for a different merchant/account/environment, but not for this supplied identity

## 7. Do multiple merchant rows exist for the same seller?

For the provided seller phone:
- **no merchant rows exist**

So:
- no duplicate merchant rows were found for this seller identity in production

## 8. Does seller auth token map to a different merchant row?

Production auth test:

`POST /auth/merchant/login`
with:
- phone: `01150100555`
- password: `100100`

### Result
- HTTP `401`
- `{"message":"Invalid credentials"}`

This proves:
- the provided credentials do not map to a merchant login in the current production backend

## Which merchant row is the seller app displaying?

From live seller device screenshot/UI dump:
- displayed store: `الشركه`
- displayed state: `APPROVED`

From production DB:
- no merchant row with store `الشركه`
- no merchant row tied to provided phone

### Therefore
The seller app is displaying a merchant identity that is **not the same as the provided seller phone’s production DB identity**.

## Which merchant rows are returned by `GET /customer/stores`?

Production API returns only:
- `cmp2prvt8002d5eujm6xzrwx5` → `مناحل البنا`
- `cmovgztrn0001hzn1porlih0t` → `مناحل الهدي`
- `cmot78gkm00016gj7imzufdzy` → `مناحل الصفا`
- `cmot6uug30001phyfudn2vgrl` → `مناحل القناوي`

These are the same approved merchant rows found in production DB.

## Are the seller-visible merchant and catalog merchants the same entity?

### No

The seller app currently shows:
- `الشركه`

But production DB/API approved merchant set contains only:
- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

So the seller-visible merchant on the device is **not the same entity set** as the current production catalog merchants returned by the backend.

## Final exact conclusion

For the provided seller identity:
- there is no merchant row in the current production DB
- provided credentials do not authenticate as a merchant
- seller app UI is showing merchant state that does not correspond to this supplied production seller identity

### Root cause for this single-merchant trace
- **identity mismatch between the seller app’s currently visible merchant session and the provided seller phone**

This is not a generic catalog filter issue for this specific trace.

## Safe next step

To continue with exact single-merchant tracing, one of these is required:
- the actual phone used by the currently logged-in seller app session showing `الشركه`
- or the JWT token from that session
- or the exact merchant ID from the seller app login response

Without that, the currently displayed seller merchant cannot be mapped truthfully to a production DB row.