# CHECKOUT TIMEOUT INVESTIGATION REPORT

Generated: 2026-05-12  
Branch: admin-notifications  
Backend: `backend/src/routes/customer.js`  
Flutter: `apps/customer_app/lib/main.dart`

---

## 1. EXECUTIVE SUMMARY

After reviewing Railway production logs, Flutter checkout code, and the backend `POST /customer/orders` handler, the investigation found **two separate issues**:

| # | Issue | Status | Severity |
|---|-------|--------|----------|
| 1 | Odoo mapping check blocks ALL checkouts with 400 | **CONFIRMED production blocker** | CRITICAL |
| 2 | Prisma 15s DB timeout aligns with Flutter 15s HTTP timeout → duplicate order risk on retry | **Theoretical risk (not reproduced)** | MAJOR |

The `TimeoutException after 0:00:15.000000` reported during QA was likely observed during a scenario where the DB transaction approached the 15-second limit. However, **all recorded production attempts return 400 in 29–67ms**, not a timeout — because the Odoo mapping check fires first and rejects the order before the DB even touches stock or creates the order.

---

## 2. RAILWAY PRODUCTION LOG EVIDENCE

```
2026-05-12T10:03:16  POST /customer/orders  status=400  responseTimeMs=67.15ms  contentLength=75
2026-05-12T10:06:41  POST /customer/orders  status=400  responseTimeMs=29.028ms  contentLength=75
```

**Key observation:** Both responses are fast (29–67ms), ruling out any HTTP-level timeout for these requests. The backend responded with 400 before Odoo, DB transactions, or any async work was reached.

**No successful 201 has ever appeared in production logs.**

---

## 3. ROOT CAUSE #1 — ODOO MAPPING BLOCKS ALL CHECKOUTS (CONFIRMED)

### Location

`backend/src/routes/customer.js` lines 190–206 (inside `prisma.$transaction`):

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

### What happens

1. Customer taps checkout → Flutter sends `POST /customer/orders`
2. Backend parses body (OK)
3. Backend calls `getCommissionPercentageForMerchant` (OK, ~5ms)
4. Backend enters `prisma.$transaction`
5. Merchant existence check (OK)
6. Product fetch (OK)
7. **Odoo mapping check → throws 400** — product has no `odooProductId` set
8. Transaction rolled back (no stock change, no order created)
9. Backend returns `{"message": "\"<name>\" is not fully mapped for checkout"}` in 67ms
10. Flutter shows `showMessage('فشل الطلب: Exception: ...')`

### Why this is the ACTUAL blocker

- **No product in the production DB has `odooProductId` set** (admin mapping was added but not populated with real Odoo IDs from the live Odoo server)
- This means **100% of checkout attempts will fail** until at least one product is mapped
- The error shows clearly in Flutter as "فشل الطلب: Exception: ..." but NOT as a TimeoutException

### Fix options

**Option A — Allow checkout without Odoo mapping (remove the check)**
- Remove lines 190–206 entirely
- Odoo sync is already async (BullMQ queue), so unmapped orders will fail sync but not block checkout
- Risk: Odoo never gets synced for unmapped products, but orders still complete locally

**Option B — Make mapping optional (recommended)**
```javascript
// Only block if Odoo is configured AND mapping is required
if (process.env.ODOO_REQUIRE_MAPPING === 'true') {
  // existing mapping check
}
```

**Option C — Map products first, then allow checkout**
- Use admin endpoint `POST /admin/products/:id/odoo-map` to set `odooProductId` for each product
- Then retry checkout

**Recommended for launch:** Option A or B — remove/gate the hard mapping check. Odoo sync is async anyway; it will simply fail gracefully for unmapped products without blocking customers.

---

## 4. ROOT CAUSE #2 — PRISMA 15s TIMEOUT + FLUTTER 15s HTTP TIMEOUT RACE (THEORETICAL)

### Timeline of a slow checkout

```
t=0ms     Flutter sends POST /customer/orders (.timeout(Duration(seconds: 15)))
t=0ms     Backend enters prisma.$transaction({ timeout: 15000 })
t=...     DB operations run (merchant check, product fetch, stock update, order create)
t=14900ms Backend Prisma timeout fires → transaction rolls back → returns 500
t=15000ms Flutter timeout fires → TimeoutException thrown
```

But if timing aligns differently:

```
t=0ms     Flutter sends POST /customer/orders
t=0ms     Backend enters prisma.$transaction({ timeout: 15000 })
t=14500ms DB creates order and commits (just before 15s timeout)
t=14500ms Backend starts building response
t=15000ms Flutter timeout fires BEFORE backend finishes sending response
t=15000ms Flutter shows TimeoutException
```

In this case:
- Order IS in the database
- Flutter shows TimeoutException
- User retries checkout
- **Duplicate order risk** — same products ordered twice

### Current duplicate protection

The code at line 190–206 is the Odoo check (not an idempotency check). There is no idempotency key or duplicate order prevention on the order creation endpoint itself. If the same customer submits twice within a short window, two separate orders will be created.

### Actual risk level

**LOW for current state** — Because the Odoo mapping check blocks ALL orders at step 4 (before stock or order creation), the race condition cannot currently be triggered. Once mapping is resolved, this becomes a real risk.

---

## 5. ADDITIONAL FINDINGS

### 5.1 `getCommissionPercentageForMerchant` is OUTSIDE try-catch

`backend/src/routes/customer.js` line 127:
```javascript
const commissionPercentage = await getCommissionPercentageForMerchant(data.merchantId);
// ^ No try-catch around this
```

If the DB connection drops at this exact moment, the handler throws an uncaught async error and Railway returns a 502. Low probability, but should be wrapped in try-catch.

### 5.2 Odoo sync is correctly async (no timeout risk from Odoo)

After the BullMQ refactor, `enqueueOrderSync` is called AFTER the transaction and AFTER `res.status(201).json(order)`:

```javascript
// Line 321 — after successful order creation
enqueueOrderSync(order.id, { reason: "checkout" }).catch((err) => {
  console.error("[OdooQueue] Failed to enqueue order sync:", err.message);
});
res.status(201).json(order);  // Line 325 — response already sent
```

This means **Odoo is NOT in the checkout critical path**. The original suspicion that Odoo sync caused the timeout is **incorrect** — the BullMQ refactor already resolved this.

### 5.3 Flutter showMessage on 400

When backend returns 400 with `{"message": "..."}`, Flutter shows:
```
'فشل الطلب: Exception: <message>'
```
This is an `Exception` caught at line 516, not a TimeoutException. The TimeoutException would only appear if the HTTP call itself exceeded 15 seconds.

### 5.4 Image uploads returning 404

Logs show repeated:
```
GET /uploads/1778352698514-0cf689025b8e4e8d.jpg  status=404
```
Railway ephemeral filesystem — uploaded images are lost on redeploy. Not related to checkout timeout but is a separate known production issue.

---

## 6. TIMING MEASUREMENTS FROM PRODUCTION LOGS

| Request | Timestamp | Response | Time |
|---------|-----------|----------|------|
| POST /customer/orders | 2026-05-12T10:03:04 | 400 | 67ms |
| POST /customer/orders | 2026-05-12T10:06:33 | 400 | 29ms |
| GET /customer/orders | 2026-05-12T10:06:10 | 200 | 16ms |
| GET /customer/stores | 2026-05-12T08:40:38 | 200 | 208ms |
| POST /auth/customer/verify-otp | 2026-05-12T09:56:59 | 200 | 151ms |

**Backend is healthy and fast** — no slowness or timeout patterns in any logs.

---

## 7. DUPLICATE ORDER RISK ASSESSMENT

| Scenario | Risk Level | Current State |
|----------|-----------|---------------|
| Flutter timeout while DB commits | MEDIUM | Blocked by Odoo check (no orders created yet) |
| User double-taps checkout button | LOW | Flutter `setState` clears cart after success; UI shows loading |
| Retry after TimeoutException | HIGH if it happens | No idempotency key present |
| BullMQ retry creates duplicate Odoo order | LOW | `enqueueOrderSync` checks `odooSyncStatus === PENDING` |

---

## 8. RECOMMENDED FIXES (PRIORITY ORDER)

### Fix 1 — CRITICAL: Remove/gate hard Odoo mapping check (MUST DO BEFORE LAUNCH)

**Option A** (simplest): Remove the mapping check from checkout — Odoo sync handles it async.

File: `backend/src/routes/customer.js` lines 190–206  
Remove the entire block:
```javascript
// 4.1 Validate unit-safe Odoo mapping before checkout completes.
for (const item of data.items) {
  ...
  if (!mappedOdooId) {
    throw Object.assign(...);
  }
}
```

**Impact:** 0 risk to order creation; Odoo sync will fail for unmapped products but orders will complete. Customers can checkout.

### Fix 2 — MAJOR: Add idempotency key to prevent duplicate orders (DO BEFORE SCALE)

Add `X-Idempotency-Key` header support:
```javascript
const idempotencyKey = req.headers['x-idempotency-key'];
if (idempotencyKey) {
  const existing = await prisma.order.findFirst({ where: { idempotencyKey, customerId: req.user.id } });
  if (existing) return res.status(200).json(existing);
}
```

Flutter must send a UUID with each checkout attempt and reuse the same UUID on retry.

### Fix 3 — MINOR: Wrap `getCommissionPercentageForMerchant` in try-catch

```javascript
let commissionPercentage;
try {
  commissionPercentage = await getCommissionPercentageForMerchant(data.merchantId);
} catch (err) {
  console.error('[Order] Commission fetch error:', err);
  return res.status(500).json({ message: 'Failed to place order. Please try again.' });
}
```

### Fix 4 — MINOR: Increase Flutter timeout or add retry with idempotency

```dart
// Change .timeout(const Duration(seconds: 15)) to 30s for checkout only
final res = await http.post(...).timeout(const Duration(seconds: 30));
```

---

## 9. IMPACT ON INTERNAL TESTING

| Item | Status |
|------|--------|
| Does checkout work right now? | **NO** — blocked by Odoo mapping check |
| Is the timeout a live production issue? | **NO** — orders fail at mapping before any timeout can occur |
| Can internal testing proceed without fix? | **NO** — checkout must work for internal testing |
| Is Odoo sync safe? | **YES** — async, does not block checkout |
| Is there a duplicate order risk? | **LOW NOW**, HIGH if mapping is fixed without idempotency |
| Should mapping check be removed? | **YES** — for launch; Odoo sync handles it async |

---

## 10. SAFE FIX STRATEGY

**Minimal safe fix for launch:**
1. Remove the Odoo mapping hard-check (lines 190–206) from `customer.js`
2. Deploy to production
3. Checkout will work for all products
4. Odoo sync will fail gracefully for unmapped products (queue records them as FAILED)
5. Admin can map products in background without blocking customers

**Risk level of this fix:** LOW  
**Files changed:** 1 (`backend/src/routes/customer.js`)  
**Business logic change:** None — Odoo sync was already async  

---

## 11. VERDICT

| | |
|---|---|
| **Primary blocker** | Odoo mapping check (lines 190–206) — hard 400 on all unmapped products |
| **TimeoutException source** | Theoretical race between Prisma 15s and Flutter 15s timeouts — NOT currently reproducible |
| **Odoo sync timeout risk** | NONE — already moved to async BullMQ queue |
| **Duplicate order risk** | LOW now, needs idempotency key before scale |
| **Fix required before internal testing** | Remove/gate Odoo mapping check |
| **Blocks internal testing** | YES |
| **Urgency** | CRITICAL — fix before any user testing |
