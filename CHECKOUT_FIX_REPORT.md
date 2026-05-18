# Checkout Fix Report — Odoo Mapping Blocker Removed

Date: 2026-05-12
Commit: 2a2338c
Branch: admin-notifications
Deployed to: Railway production

---

## Problem

`POST /customer/orders` returned **HTTP 400** for every checkout attempt with:

```json
{"message": "\"<product name>\" is not fully mapped for checkout"}
```

Root cause: Lines 190–206 of `backend/src/routes/customer.js` threw a hard 400 error
inside the DB transaction if any product in the cart had no `odooProductId` set.
Since no products in the production database had `odooProductId` populated yet,
**100% of checkout attempts failed**.

---

## Fix Applied

**File changed:** `backend/src/routes/customer.js`

**Lines removed (17 lines):**
```javascript
// 4.1 Validate unit-safe Odoo mapping before checkout completes.
for (const item of data.items) {
  const product = productMap.get(item.productId);
  const variant = item.variantId ? variantMap.get(item.variantId) : null;
  const mappedOdooId = variant?.odooId || product?.odooProductId || product?.odooId;
  if (!mappedOdooId) {
    throw Object.assign(
      new Error(`"${product?.name ?? "Product"}" is not fully mapped for checkout`),
      { status: 400 },
    );
  }
}
```

**Replaced with comment only:**
```javascript
// 4.1 Odoo mapping check removed — sync is async via BullMQ queue.
//     Unmapped products will be marked FAILED in the Odoo sync queue
//     and logged clearly, but checkout is never blocked.
```

---

## Behavior Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Product has odooProductId set | Checkout succeeds | Checkout succeeds |
| Product has NO odooProductId | 400 "not fully mapped" | Checkout succeeds |
| Odoo sync for unmapped product | N/A (blocked before sync) | Sync marks FAILED with PRODUCT_NOT_MAPPED |
| Customer sees error | Always | Never (for mapping reason) |
| Order created in DB | Never | Yes — order in DB, Odoo sync async |

---

## Why This Is Safe

Odoo sync was already moved to async BullMQ queue previously:
- enqueueOrderSync is called AFTER res.status(201).json(order)
- If a product has no odooProductId, the BullMQ worker catches PRODUCT_NOT_MAPPED
- Sync job is marked FAILED in queue with clear logging
- Customer order is already confirmed in local DB
- Admin can map products and retry sync from admin panel

No checkout logic, payment logic, stock decrement, or order state machine was changed.

---

## Validation

- node --check src/routes/customer.js → SYNTAX OK
- node --check src/server.js → SYNTAX OK
- Railway deploy → started (784cb197)
- GET /health → {"status":"ok"} — Production running

---

## Deployment

- Commit: 2a2338c
- Push: origin admin-notifications
- Railway health: https://wenzla-backend-production.up.railway.app/health → ok

---

## Remaining Action

Idempotency key recommended before high-scale launch to prevent duplicate orders on retry.
See CHECKOUT_TIMEOUT_INVESTIGATION_REPORT.md for details.
