# Second Railway Project Audit — `wenzla store app data pase`

## Scope
- Read-only audit only
- No writes
- No fixes applied

## Project inspected

| Item | Value |
|---|---|
| Project name | `wenzla store app data pase` |
| Project ID | `bbba2087-77a7-47ba-8d54-eaf531eebb22` |
| Environment | `production` |

## Services found

| Service type | Service name | Public URL |
|---|---|---|
| Database | `Postgres` | none |
| Database | `Redis` | none |

### Important finding
- This second Railway project has **no backend service**
- It contains **only Postgres + Redis**

So it cannot directly serve seller or customer app traffic by itself.

## DATABASE_URL target

Safe fingerprint:

| Project | DB fingerprint |
|---|---|
| `wenzla store app data pase` | `shortline.proxy.rlwy.net:38672/railway` |

## Merchant / product / order counts

Queried read-only using the second project DB URL:

| Table summary | Count |
|---|---|
| merchants | `4` |
| approved merchants | `4` |
| products | `8` |
| active products | `8` |
| orders | `32` |

## Merchants found

- `مناحل البنا`
- `مناحل الهدي`
- `مناحل الصفا`
- `مناحل القناوي`

Searches for:
- `الشركة`
- `الشركه`
- likely new merchant names

Result:
- **not found**

## Comparison vs current production DB

Current production backend DB fingerprint:
- `shortline.proxy.rlwy.net:38672/railway`

Second project DB fingerprint:
- `shortline.proxy.rlwy.net:38672/railway`

### Critical finding
- The second project database is the **same exact database** as the current production backend database
- Counts and merchant rows matched exactly

## Does this second project contain the missing merchants?

**No.**

It contains the same 4 merchants only.

It does **not** contain:
- `الشركة`
- `الشركه`
- any additional newly created seller merchants

## Did old seller creation/write paths point here?

### Direct answer
- If any old path pointed to this second project DB, it would still be the **same underlying database** as the current production backend DB
- So this second project does **not** explain a split where seller writes landed somewhere else with extra merchants

## Final mapping conclusion

| Consumer / path | Backend | Database |
|---|---|---|
| Seller app default production host | `https://wenzla-backend-production.up.railway.app` | `shortline.proxy.rlwy.net:38672/railway` |
| Customer app default production host | `https://wenzla-backend-production.up.railway.app` | `shortline.proxy.rlwy.net:38672/railway` |
| Production catalog API `/customer/stores` | `https://wenzla-backend-production.up.railway.app/customer/stores` | `shortline.proxy.rlwy.net:38672/railway` |
| Second Railway project `wenzla store app data pase` | no backend service | `shortline.proxy.rlwy.net:38672/railway` |

## Migration recommendation

### Should merchants/products be migrated?
- **No migration recommended yet**
- This second project does **not** contain a different merchant dataset to merge

### Which DB should be the single source of truth?
- Keep the current production backend DB as the single source of truth:
  - `shortline.proxy.rlwy.net:38672/railway`

### Safest merge strategy
- No DB merge needed between these two audited Railway projects
- They already point to the same underlying Postgres

### Can customer/seller apps continue working without rebuilding?
- **Yes**
- Because the issue is not APK-related and not caused by this second project

## Final conclusion

The second Railway project does **not** explain the missing merchant/catalog split.

It has:
- no backend service
- the same Postgres fingerprint as the current production backend
- the same merchant dataset

So the missing merchants are absent from both places because these two audited Railway projects are effectively using the same underlying production database.