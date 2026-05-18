# Railway Environment Split Audit

## Projects found

| Project name | Notes |
|---|---|
| `wenzla stor app` | Active Railway project linked to current backend |
| `wenzla store app data pase` | Present in account; not used in current backend workspace audit |
| `ad watch app` | Unrelated |

## Active Wenzla Railway project

| Item | Value |
|---|---|
| Project | `wenzla stor app` |
| Project ID | `3c43a301-9569-41fb-8856-0da92eac674b` |
| Environments | `production`, `staging` |
| Backend service name | `wenzla-backend` |

## Backend services by environment

| Environment | Backend service | Public backend URL | DATABASE_URL fingerprint (masked) |
|---|---|---|---|
| production | `wenzla-backend` | `https://wenzla-backend-production.up.railway.app` | `shortline.proxy.rlwy.net:38672/railway` |
| staging | `wenzla-backend` | `https://wenzla-backend-staging.up.railway.app` | `postgres.railway.internal:5432/railway` |

## Seller app / customer app backend host check

From source defaults:

- seller app default host: `https://wenzla-backend-production.up.railway.app`
- customer app default host: `https://wenzla-backend-production.up.railway.app`

### Result
- **Seller app and customer app point to the same production backend host by default**

## Production DB actually powering `/customer/stores`

Verified by:
- Railway production environment variables
- Railway production `DATABASE_URL`
- direct production Prisma query

### Production catalog API mapping
- API: `GET https://wenzla-backend-production.up.railway.app/customer/stores`
- Database fingerprint: `shortline.proxy.rlwy.net:38672/railway`

### Current production DB contents
- merchant rows: `4`
- approved merchants: `4`
- active products: `8`

Production merchants found:
- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

## Which DB contains the visible seller merchants?

### Current evidence
- The real production DB behind `wenzla-backend-production` contains only the 4 merchants listed above
- It does **not** contain:
  - `الشركه`
  - the newly claimed “visible seller” merchants

### Therefore
- the “visible seller merchants” are **not present in the current production DB** that powers `/customer/stores`
- they must be coming from one of:
  1. a different environment/database
  2. stale session/UI state previously seen in seller app
  3. a different Railway project/backend not yet audited via direct DB query

## Does seller creation write into a different environment/database?

### What is confirmed
- Merchant registration code in this repo writes to whatever DB is behind the active backend service environment
- For production backend, that DB is:
  - `shortline.proxy.rlwy.net:38672/railway`

### What is not confirmed from current read-only evidence
- whether the merchant creation flow the user observed was actually hitting:
  - staging backend
  - another Railway project
  - another backend instance
  - cached seller app state

### Strong conclusion
- The merchants missing from the customer production catalog were **not written into the currently queried production DB**

## Final mapping table

| Consumer | Backend | Database |
|---|---|---|
| Seller app (default production build) | `https://wenzla-backend-production.up.railway.app` | `shortline.proxy.rlwy.net:38672/railway` |
| Customer app (default production build) | `https://wenzla-backend-production.up.railway.app` | `shortline.proxy.rlwy.net:38672/railway` |
| Production catalog API `/customer/stores` | `https://wenzla-backend-production.up.railway.app/customer/stores` | `shortline.proxy.rlwy.net:38672/railway` |

## Final conclusion

- There is **no evidence** in this repo or Railway production env that seller app and customer app are intentionally pointed at different production backend hosts.
- The production catalog API is reading from the production DB at:
  - `shortline.proxy.rlwy.net:38672/railway`
- The missing “new merchants” are **absent from that DB**.
- So the real split is not inside `/customer/stores`; the split is **upstream in where merchant creation/visibility was happening**.

## Safest next read-only step if needed

Audit the other Railway project:
- `wenzla store app data pase`

Specifically:
- list its services
- inspect any backend service URLs
- fingerprint its DB
- compare merchant rows there against the missing seller-visible merchants