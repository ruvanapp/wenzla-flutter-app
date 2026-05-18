# Odoo Production Review

## 1. Scope of this review

This review documents the **current local implementation** of the hardened Odoo integration before any new commit or push.

It focuses on:

- `backend/src/services/odooOrderSync.js`
- `backend/src/services/odoo.js`
- `backend/src/routes/odoo.js`
- Prisma schema changes supporting production Odoo order sync

---

## 2. Files covered

Primary implementation files:

1. `backend/src/services/odooOrderSync.js`
2. `backend/src/services/odoo.js`
3. `backend/src/routes/odoo.js`
4. `backend/prisma/schema.prisma`

Related support files affected by this production hardening pass:

5. `backend/src/routes/customer.js`
6. `backend/src/routes/merchant.js`
7. `backend/src/routes/admin.js`
8. `backend/src/server.js`
9. `backend/src/utils/logger.js`
10. `backend/package.json`
11. `backend/package-lock.json`

---

## 3. How `src/services/odooOrderSync.js` was rebuilt after becoming empty

During the previous implementation sequence, `backend/src/services/odooOrderSync.js` was found to be **0 bytes**.

That meant the earlier order sync logic was no longer present on disk.

### What I did to rebuild it

I rebuilt the file from the actual required production features, not by placeholder recovery.

The rebuilt file now includes:

1. **BullMQ queue integration**
2. **Redis connection handling**
3. **Order sync worker**
4. **Retry + exponential backoff**
5. **Dead-letter accumulation**
6. **Circuit breaker**
7. **XML-RPC timeout wrapper**
8. **Partner find-or-create logic**
9. **Idempotent sale order lookup/create logic**
10. **Status push to Odoo**
11. **Status pull from Odoo**
12. **Persistent local sync state updates on `Order`**
13. **Structured request-ID-based logging**
14. **Odoo sync log writes to `OdooSyncLog`**

So the file was not merely restored — it was rebuilt as a new production-grade version.

---

## 4. FULL implementation details — `backend/src/services/odooOrderSync.js`

### Purpose

This file is now the main production orchestration layer for:

- queueing Odoo order work
- syncing local orders to Odoo asynchronously
- syncing local status changes to Odoo
- pulling remote status back from Odoo
- retrying failed syncs
- tracking sync state directly on `Order`

### Queue constants

Defined at the top:

- `ORDER_SYNC_QUEUE = 'odoo-order-sync'`
- `MAX_RETRIES = 5`
- `CIRCUIT_BREAKER_THRESHOLD = 5`
- `CIRCUIT_BREAKER_WINDOW_MS = 60_000`
- `CIRCUIT_BREAKER_COOLDOWN_MS = 120_000`
- `XMLRPC_TIMEOUT_MS = Number(process.env.ODOO_TIMEOUT_MS ?? 10_000)`

### Queue / worker state

The file stores:

- `queueInstance`
- `workerInstance`
- `queueEventsCache.deadLetter`
- in-memory `circuitBreaker` state

### Redis connection

`getRedisConnection()` supports:

- `REDIS_URL`
- `REDIS_TLS_URL`
- or host/port variables:
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
  - `REDIS_USERNAME`
  - `REDIS_TLS`

### Circuit breaker behavior

Implemented by:

- `pruneFailures()`
- `recordCircuitFailure()`
- `resetCircuitBreaker()`
- `circuitAllowsRequests()`

Behavior:

- too many failures in the window → breaker opens
- open breaker blocks new queue dispatch
- after cooldown → HALF_OPEN behavior allows requests again

### XML-RPC timeout wrapper

`xmlRpcWithTimeout(model, method, args, kwargs, requestId)` wraps `executeKw(...)` with `Promise.race`.

This ensures:

- a stuck XML-RPC request fails
- the failure is logged with:
  - request ID
  - model
  - method

### XML-RPC response validation

`validateXmlRpcResponse(value, context)` throws if the response is `undefined`.

This is a minimal but real validation layer to stop silent bad responses.

### Persistent sync state on Order

`setOrderSyncState(orderId, data)` updates:

- `odooSyncStatus`
- `odooSyncError`
- `odooSyncRequestId`
- `odooLastSyncedAt`

### Partner sync flow

`createOrFindPartner(user, order, requestId)`:

1. reuse `user.odooPartnerId` if available
2. else search `res.partner` by phone
3. else search by marker inside `comment`
4. else create a new `res.partner`
5. persist `User.odooPartnerId`

### Product mapping validation

`validateProductMappings(order, requestId)` checks every order item before Odoo sync:

1. product or variant must have local Odoo ID
2. remote Odoo `product.product` must exist
3. remote product must be saleable (`sale_ok`)

This is stricter than the prior implementation.

### Idempotency protection

`findExistingSaleOrder(order, requestId)` checks:

1. local `order.odooId`
2. Odoo `sale.order.client_order_ref = order.id`
3. Odoo `sale.order.origin = WENZLA:${order.id}`

This prevents accidental duplicate `sale.order` creation.

### Custom field fallback

`tryCreateSaleOrder(values, requestId)`:

1. tries to create with `x_studio_wenzla_order_id`
2. if Odoo rejects unknown/custom field
3. removes that field
4. retries creation safely

So there is no hard dependency anymore on `x_studio_wenzla_order_id`.

### Core order creation flow

`syncOrderCore(orderId, reason, requestId)` performs:

1. load local order + customer + items + products + variants
2. validate product mappings
3. create/find partner
4. build `sale.order` payload
5. try to find existing remote order
6. create or update remote sale order
7. confirm or cancel remote order based on local status
8. persist:
   - `Order.odooId`
   - `Order.odooPartnerId`
   - sync status fields
9. write success log
10. reset circuit breaker

### Failure handling

`handleSyncFailure(orderId, reason, requestId, error, attempt)`:

1. records circuit failure
2. marks local `Order.odooSyncStatus`
   - `FAILED`
   - or `DEAD_LETTER`
3. stores `odooSyncError`
4. writes `OdooSyncLog`
5. pushes permanent failures into in-memory dead-letter cache
6. structured logs the failure

### Queue dispatch

`enqueueOrderSync(orderId, { reason, requestId })`:

1. marks order `QUEUED`
2. checks config
3. checks circuit breaker
4. adds BullMQ job:
   - name: `sync-order`
   - jobId: `order:${orderId}`
   - exponential backoff
   - max attempts = 5

`enqueueOrderStatusSync(orderId, status, { reason, requestId })`:

1. adds BullMQ job:
   - name: `sync-order-status`
   - jobId: `order-status:${orderId}:${status}`
2. marks local order `QUEUED`

### Manual direct sync

`syncOrderToOdoo(orderId, ...)`:

- marks `PROCESSING`
- directly runs `syncOrderCore(...)`

This is what the manual admin route uses.

### Status sync to Odoo

`syncOrderStatusToOdoo(orderId, status, ...)`:

1. loads local order
2. ensures it has `odooId`
3. maps status
4. calls remote `action_cancel` or `action_confirm`
5. updates local sync fields
6. writes success log

### Pull status from Odoo

`pullOrderStatusesFromOdoo({ limit, requestId })`:

1. loads local orders with `odooId`
2. fetches remote `sale.order.state`
3. maps Odoo state → local status
4. updates local order if needed
5. writes `FROM_ODOO` logs

### Retry failed syncs

`retryFailedOrderSyncs()`:

1. finds local orders with sync status:
   - `FAILED`
   - `DEAD_LETTER`
2. re-enqueues them

### Monitoring

`getOrderSyncMonitoring()` returns:

- circuit breaker state
- dead-letter cache

### Worker boot

`startOrderSyncWorker()`:

1. creates BullMQ worker
2. handles:
   - `sync-order`
   - `sync-order-status`
3. on failure:
   - calls `handleSyncFailure(...)`
4. attaches worker listeners:
   - `failed`
   - `completed`

---

## 5. FULL implementation details — `backend/src/services/odoo.js`

### Purpose

This file is the low-level self-hosted Odoo XML-RPC client.

It is responsible for:

- authentication
- raw XML-RPC execution
- Odoo connection testing
- startup Odoo sample verification

### Protocol and endpoints

Uses XML-RPC through the `xmlrpc` npm package.

Endpoints are built from:

- `ODOO_URL`
- `/xmlrpc/2/common`
- `/xmlrpc/2/object`

### Environment variables used

- `ODOO_URL`
- `ODOO_DB`
- `ODOO_USERNAME`
- `ODOO_PASSWORD`

### Main functions

#### `isOdooConfigured()`

Checks required env vars exist.

#### `authenticate(force = false)`

Uses:

```txt
common.authenticate(db, username, password, {})
```

Behavior:

- caches UID for `AUTH_TTL_MS`
- logs structured success/failure
- distinguishes:
  - access denied
  - bad database
  - network error
  - endpoint error

#### `executeKw(model, method, args, kwargs)`

Uses:

```txt
object.execute_kw(db, uid, password, model, method, args, kwargs)
```

Behavior:

- authenticates first
- logs success/failure
- clears auth cache on failure

#### Compatibility wrappers

Still exports:

- `odooCall`
- `odooSearch`
- `odooCreate`
- `odooWrite`
- `odooArchive`
- `odooSearchOrCreate`

These are used by existing Odoo product/category sync code.

#### `testOdooConnection()`

Checks:

1. config exists
2. calls `common.version`
3. calls `authenticate(true)`

Returns:

- `ok`
- `serverVersion`
- `authOk`
- `uid`

#### `runStartupOdooCheck()`

On server boot:

1. authenticates
2. logs UID
3. fetches 5 `res.partner` rows
4. logs structured sample output

### Structured logging added

This file now uses:

- `logInfo`
- `logWarn`
- `logError`

instead of plain console logging for major Odoo events.

---

## 6. FULL implementation details — `backend/src/routes/odoo.js`

### Purpose

This is the admin router for Odoo operations.

All routes require:

```js
requireAuth(['ADMIN'])
```

### Existing route groups still present

#### Health / status

- `GET /admin/odoo/status`

Returns:

- `configured`
- `connected`
- `serverVersion`
- `latencyMs`

#### Phase 3B category sync

- `POST /admin/odoo/sync/categories`
- `POST /admin/odoo/sync/categories/dry-run`

#### Phase 3B product sync

- `POST /admin/odoo/sync/products`
- `POST /admin/odoo/sync/products/dry-run`

#### Phase 3B retry for product/category sync

- `POST /admin/odoo/sync/retry`

#### Sync logs

- `GET /admin/odoo/logs`

### Order sync routes added

#### `POST /admin/odoo/sync/orders`

Body:

```json
{ "orderId": "..." }
```

Purpose:

- manually sync a single local order to Odoo immediately

#### `POST /admin/odoo/sync/orders/status/pull`

Body:

```json
{ "limit": 50 }
```

Purpose:

- pull Odoo order statuses into local DB

#### `POST /admin/odoo/sync/orders/retry`

Purpose:

- retry failed or dead-letter order syncs by re-enqueueing them

### New production monitoring / health routes

#### `GET /admin/odoo/health`

Returns:

- `odoo` connection status from `testOdooConnection()`
- queue/circuit/dead-letter info from `getOrderSyncMonitoring()`

#### `GET /admin/odoo/monitoring`

Returns:

- queue monitoring snapshot
- local orders whose sync status is:
  - `FAILED`
  - `DEAD_LETTER`
  - `QUEUED`
  - `PROCESSING`

This acts as a lightweight retry dashboard / queue monitoring endpoint.

---

## 7. Queue flow

### Checkout / status updates

1. local Prisma transaction completes first
2. route handler returns local response or continues normal flow
3. queue job is created
4. BullMQ worker processes the job

### Queue job types

- `sync-order`
- `sync-order-status`

### Queue IDs for idempotency

- `order:${orderId}`
- `order-status:${orderId}:${status}`

### Queue state progression

Typical:

```txt
PENDING -> QUEUED -> PROCESSING -> SYNCED
```

Failure:

```txt
PENDING -> QUEUED -> FAILED -> DEAD_LETTER
```

---

## 8. Retry flow

### Automatic retries

BullMQ job settings:

- `attempts: 5`
- `backoff.type: 'exponential'`
- `backoff.delay: 5000`

### Permanent failure

When max retries are exhausted:

- local order sync state becomes `DEAD_LETTER`
- failure is cached in dead-letter monitoring
- `OdooSyncLog` entry is written with exhausted/failed semantics

### Manual retry

Admin calls:

```txt
POST /admin/odoo/sync/orders/retry
```

This re-enqueues eligible failed orders.

---

## 9. Order creation flow

### Local checkout path

`POST /customer/orders`

Flow:

1. validate request
2. validate merchant
3. validate products/variants
4. validate Odoo mapping before checkout completes
5. decrement stock atomically
6. create local order
7. return local success
8. enqueue Odoo sync

### Remote Odoo sync path

1. load full local order
2. validate remote product mapping
3. create/find partner
4. search for existing Odoo order
5. create or update `sale.order`
6. optionally confirm/cancel sale order
7. persist local Odoo IDs
8. mark local sync state

---

## 10. Failure handling flow

### If Odoo is down before enqueue

- queue dispatch is blocked by:
  - config failure
  - circuit breaker open
- order is marked failed locally
- checkout still remains locally successful

### If Odoo fails during worker execution

- job throws
- failure is logged
- sync state becomes `FAILED`
- retries continue automatically

### If retries are exhausted

- local order → `DEAD_LETTER`
- dead-letter cache entry created
- monitoring endpoint exposes it

### If custom field does not exist

- order creation retries without `x_studio_wenzla_order_id`

### If XML-RPC hangs

- timeout wrapper aborts the logical operation
- failure counts toward retries and circuit breaker

---

## 11. Idempotency protection

Protection exists at several levels:

### Local queue level

BullMQ job IDs:

- `order:${orderId}`
- `order-status:${orderId}:${status}`

This prevents duplicate active queue jobs for the same payload key.

### Remote lookup level

Before creating a sale order, the code searches:

1. local `Order.odooId`
2. Odoo `client_order_ref = order.id`
3. Odoo `origin = WENZLA:${order.id}`

This reduces duplicate `sale.order` creation risk.

### Fallback field independence

Even if custom field storage is unavailable, `origin` and `client_order_ref` still provide idempotency anchors.

---

## 12. Prisma schema changes

### `User`

Added:

- `odooPartnerId String?`

Index added:

- `@@index([odooPartnerId])`

### `ProductVariant`

Added:

- `odooId String?`
- `orderItems OrderItem[]`

Index added:

- `@@index([odooId])`

### `Order`

Added:

- `odooId String?`
- `odooPartnerId String?`
- `odooSyncStatus String @default("PENDING")`
- `odooSyncError String?`
- `odooLastSyncedAt DateTime?`
- `odooSyncRequestId String?`

Index added:

- `@@index([odooSyncStatus])`

### `OrderItem`

Added:

- `odooId String?`
- `variant ProductVariant? @relation(fields: [variantId], references: [id])`

Index added:

- `@@index([odooId])`

---

## 13. All new database fields added

### User

- `odooPartnerId`

### ProductVariant

- `odooId`

### Order

- `odooId`
- `odooPartnerId`
- `odooSyncStatus`
- `odooSyncError`
- `odooLastSyncedAt`
- `odooSyncRequestId`

### OrderItem

- `odooId`

---

## 14. Risks / missing edge cases

### 1. `OrderItem.odooId` is still not populated

The schema supports it, but the current implementation does not yet read back created `sale.order.line` IDs and persist them locally.

### 2. Queue monitoring is lightweight, not a full UI dashboard

There is an endpoint, but not a dedicated visual dashboard.

### 3. Circuit breaker is in-memory only

If the process restarts, breaker history resets.

### 4. Dead-letter cache is in-memory only

Persistent state still exists on `Order` and `OdooSyncLog`, but the dead-letter cache array itself is not persistent across restarts.

### 5. XML-RPC response validation is minimal

Current validation ensures non-undefined responses, but not deep schema validation of every remote payload.

### 6. Product mapping validation assumes local Odoo IDs are valid `product.product` IDs

If a local ID points to a template or wrong remote model, the sync may fail.

### 7. Unit-safe validation is still limited

The code validates saleability and existence, but does not yet deeply validate unit of measure compatibility against local quantity semantics.

### 8. Queue dependency on Redis

Production now requires Redis availability. Without Redis, queue worker startup will fail.

### 9. Manual status pull is still admin-triggered

There is no webhook or scheduled pull yet.

### 10. Worker lifecycle is process-local

If multiple application instances run, worker concurrency and queue topology should be reviewed carefully.

---

## 15. Summary

The current local implementation has moved from:

- best-effort `setImmediate` background sync

to:

- queued BullMQ sync
- exponential retry
- dead-letter handling
- circuit breaker
- structured logging
- persistent sync status on `Order`
- fallback for missing custom fields
- stronger idempotency checks
- admin monitoring endpoints

No push was performed for this review file.
