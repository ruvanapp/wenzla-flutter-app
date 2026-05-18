# Redis Blocker Report

## 1. Why Redis connection is failing

Redis connection is failing because there is currently **no reachable Redis server** for BullMQ to use.

Observed validation result:

```txt
ECONNREFUSED 127.0.0.1:6379
```

This means the code tried to connect to a local Redis instance on:

```txt
127.0.0.1:6379
```

but no Redis server was running there.

Also confirmed:

- `redis-server` is not installed or not available in PATH
- `redis-cli` is not installed or not available in PATH
- no Redis environment variables were present in the shell during validation

So BullMQ is currently falling back to localhost Redis, and that fallback is failing.

---

## 2. Current Redis env vars expected

The current code supports these Redis environment variables:

### Preferred

```env
REDIS_URL=redis://...
```

or

```env
REDIS_TLS_URL=rediss://...
```

### Fallback host/port mode

```env
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
REDIS_USERNAME=...
REDIS_TLS=true
```

If none of those are provided, the code falls back to:

```txt
127.0.0.1:6379
```

---

## 3. Current BullMQ configuration

BullMQ is configured in:

```txt
backend/src/services/odooOrderSync.js
```

Current queue name:

```txt
odoo-order-sync
```

Current retry settings:

- attempts: `5`
- backoff type: `exponential`
- backoff delay: `5000`

Current queue job types:

- `sync-order`
- `sync-order-status`

Current queue behavior:

- jobs are added with deterministic `jobId`
- successful jobs are removed after completion
- failed jobs are retained

---

## 4. Exact Redis connection code

Current Redis connection code:

```js
function getRedisConnection() {
  const connectionString = process.env.REDIS_URL ?? process.env.REDIS_TLS_URL;
  if (connectionString) {
    return { connection: { url: connectionString } };
  }

  return {
    connection: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USERNAME || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: null,
    }
  };
}
```

This means:

1. first try `REDIS_URL` or `REDIS_TLS_URL`
2. otherwise use host/port config
3. otherwise default to localhost

---

## 5. Whether Upstash Redis is configured or not

At the time of validation:

- **Upstash Redis was not configured in the local shell**
- no `REDIS_URL`
- no `REDIS_TLS_URL`

So from the current runtime environment available to validation, **Upstash is not configured**.

This does **not** prove it is absent in Railway production variables, but it was not available in the local validation shell.

---

## 6. Railway Redis setup steps required

To make BullMQ production-safe on Railway, Redis must be provisioned and connected to the backend service.

### Option A — Railway Redis service

1. Open your Railway project
2. Add a new service
3. Choose **Redis**
4. Wait for Railway to provision it
5. Open the Redis service variables
6. Copy the Redis connection URL
7. Add that URL to the backend service as:

```env
REDIS_URL=redis://...
```

or if TLS is required:

```env
REDIS_TLS_URL=rediss://...
```

### Option B — Upstash Redis

1. Create an Upstash Redis database
2. Copy the connection URL
3. Add it to Railway backend variables as:

```env
REDIS_URL=redis://...
```

or:

```env
REDIS_TLS_URL=rediss://...
```

### After setup

1. Redeploy backend
2. Verify `/admin/odoo/health`
3. Verify `/admin/odoo/monitoring`
4. Run one real queue-backed order sync test

---

## 7. Which env vars are missing

Missing from the validation shell:

```env
REDIS_URL
REDIS_TLS_URL
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
REDIS_USERNAME
REDIS_TLS
```

Because none were available, the system fell back to:

```txt
127.0.0.1:6379
```

and failed there.

---

## 8. Whether queue jobs persist currently

### Current answer

**No, not in a production-safe way from the validated environment.**

Why:

- BullMQ job persistence depends on Redis
- Redis was unreachable
- therefore queued jobs cannot be guaranteed to persist

Code-wise, BullMQ is configured correctly to persist jobs **if Redis is available**.

But in the current validation environment, persistence is blocked by missing Redis.

---

## 9. Whether retries currently work

### Current answer

**Not fully in a real queue-backed environment yet.**

What is implemented in code:

- BullMQ attempts = 5
- exponential backoff
- dead-letter handling

What is blocked:

- real retry execution depends on Redis
- without Redis, queue jobs do not run normally

So retry logic is implemented, but **not fully validated end-to-end** because Redis is unavailable.

---

## 10. Whether order sync currently depends on Redis availability

### Yes

The new production-hardening design now depends on Redis availability for:

- queued order sync
- queued order status sync
- automatic retries
- backoff behavior
- dead-letter workflow

Without Redis:

- queue-based Odoo dispatch cannot be relied on
- worker processing cannot be guaranteed

---

## 11. Safe fallback behavior if Redis is unavailable

### Current behavior

The local order transaction still completes first.

That means:

- checkout remains locally successful
- local order is still created
- stock is still decremented locally
- customer flow still completes

However:

- Odoo queue dispatch is not production-safe without Redis
- order sync may fail before durable queueing happens

### Important nuance

This is **not yet a full durable fallback strategy**.

It is only safe in the sense that:

- local checkout is not blocked
- local order data is not lost

But remote Odoo sync durability is not guaranteed until Redis is configured.

### Best current fallback path

If Redis is unavailable:

1. local order still exists
2. local sync status can be marked failed
3. admin can later retry after Redis/Odoo recovery

For a truly production-safe fallback, Redis must be available.

---

## 12. What remains before production-safe push

Before a production-safe push, these items still need to be completed:

### Redis / queue validation

1. Provision Redis on Railway or Upstash
2. Add Redis env vars to backend
3. Confirm queue can connect successfully
4. Confirm BullMQ worker starts with real Redis
5. Confirm jobs persist across restarts

### End-to-end Odoo queue validation

6. Run one successful order sync through the queue
7. Run one failed order sync through the queue
8. Confirm exponential backoff retries happen
9. Confirm dead-letter behavior works after max retries

### Database / runtime validation

10. Set real `DATABASE_URL`
11. Run `prisma db push` or production-safe migration flow
12. Verify new `Order` sync fields exist in DB

### Final confidence checks

13. Confirm `/admin/odoo/health` returns healthy queue + Odoo status
14. Confirm `/admin/odoo/monitoring` shows useful queue/order sync data
15. Re-run full validation only after Redis + DB + Odoo env vars are real

---

## Final conclusion

The code now contains a proper BullMQ-based design, but **Redis is the current blocker**.

Without Redis:

- queue durability is not guaranteed
- automatic retries are not fully operational
- production-safe push should not be claimed as validated

So the next required step is:

```txt
Provision Redis and set Redis environment variables
```

before final production validation and push.