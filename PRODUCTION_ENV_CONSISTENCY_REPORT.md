## Production Environment Consistency Report

### Scope
- Read-only environment/write-target consistency audit
- No frontend analysis
- No app rebuilds
- No production writes

## 1. Admin panel backend target

Verified in code:

- `admin-dashboard/lib/api.ts`
- `admin-dashboard/app/admin-client.tsx`
- `backend/admin.html.pre-odoo-stable`

All default to:

- `https://wenzla-backend-production.up.railway.app`

### Conclusion
- Admin panel targets the **production backend host**

## 2. Admin approval API target

Verified route:

- `PATCH /admin/merchants/:id/status`

Verified handler:

- `backend/src/routes/admin.js`

Write path:

- `prisma.merchant.update({ where: { id: req.params.id }, data: { status, blockedReason } })`

### Conclusion
- Admin approval writes through the **same production backend service**

## 3. Seller app backend target

Verified in:

- `apps/merchant_app/lib/main.dart`

Default API host:

- `https://wenzla-backend-production.up.railway.app`

## 4. Customer app backend target

Verified in:

- `apps/customer_app/lib/main.dart`

Default API host:

- `https://wenzla-backend-production.up.railway.app`

## 5. Exact DATABASE_URL used during admin approval write

Verified from Railway production backend environment:

- Environment: `production`
- Backend service: `wenzla-backend`
- DATABASE_URL fingerprint:
  - `shortline.proxy.rlwy.net:38672/railway`

## 6. Exact DATABASE_URL used by `GET /customer/stores`

Verified from the same Railway production backend service:

- Environment: `production`
- Backend service: `wenzla-backend`
- DATABASE_URL fingerprint:
  - `shortline.proxy.rlwy.net:38672/railway`

## 7. Proof: admin approval write target vs catalog read target

### Result
- Admin approval writes and `GET /customer/stores` reads use the **same backend service**
- They use the **same production DATABASE_URL**
- They use the **same production database**

### Therefore
- There is **no evidence** that approval writes are landing in a different DB/environment than the production catalog read path

## 8. Production proof from admin activity log

Latest production admin merchant status writes found:

- `مناحل الصفا` → `APPROVED`
- `مناحل البنا` → `APPROVED`
- `مناحل الهدي` → `APPROVED`

These entries were written in the same production DB that powers `/customer/stores`.

## 9. Newest traced merchant in production DB

Newest directly traced merchant row:

- `storeName = QA_PROD_TRACE_20260515`
- `merchant.id = cmp6cd1y6008k5eujzvqqiunp`
- `status = PENDING`
- `createdAt = 2026-05-15T03:12:10.015Z`
- `updatedAt = 2026-05-15T03:12:10.015Z`

This row exists in the same production DB serving `/customer/stores`.

## 10. Is there evidence that this merchant was approved in production DB?

### No

For the newest traced merchant:

- status is still `PENDING` in the production DB
- `updatedAt` did not change after creation
- no matching recent `UPDATE_STATUS` admin activity was found for this merchant ID

### Therefore
- the production DB row serving `/customer/stores` did **not** change to `APPROVED` for this traced merchant

## 11. Final conclusion

### Proven
- Admin panel backend target = production backend
- Admin approval API target = production backend
- Seller app backend target = production backend
- Customer app backend target = production backend
- Admin approval writes and `/customer/stores` reads share the **same production DB**

### Not proven
- A newly approved merchant changing to `APPROVED` in that same DB for the exact newest merchant we traced

### Strongest exact conclusion
- The issue is **not** a split between admin approval DB and customer catalog DB
- For the traced newest merchant, the production DB row serving `/customer/stores` remains `PENDING`
- So either:
  1. the approval action was not actually applied to that exact merchant row, or
  2. a different merchant than the intended one was approved, or
  3. the merchant that was “approved” was not the same row later checked in the production catalog

## 12. Next exact proof needed

To finish the single-merchant consistency trace with certainty:

- exact `merchant.id` that was approved in admin

Then we can verify directly in production DB:

- whether that exact row changed to `APPROVED`
- whether it appears in `/customer/stores`
- whether the admin action targeted the intended merchant row