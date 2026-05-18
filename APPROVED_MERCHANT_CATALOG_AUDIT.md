## Approved Merchant Catalog Audit

### Scope
- Production backend only
- No app rebuilds
- No frontend changes
- No writes applied

## Exact comparison performed

Compared:

1. Production DB approved merchants:
   - `prisma.merchant.findMany({ where: { status: "APPROVED" } ... })`
2. Live production API output:
   - `GET /customer/stores`

## Result

The sets match exactly.

### Approved merchants in production DB

| merchant.id | storeName | status | productCount | activeProducts |
|---|---|---|---:|---:|
| `cmp2prvt8002d5eujm6xzrwx5` | `مناحل البنا` | `APPROVED` | 0 | 0 |
| `cmovgztrn0001hzn1porlih0t` | `مناحل الهدي` | `APPROVED` | 1 | 1 |
| `cmot78gkm00016gj7imzufdzy` | `مناحل الصفا` | `APPROVED` | 1 | 1 |
| `cmot6uug30001phyfudn2vgrl` | `مناحل القناوي` | `APPROVED` | 6 | 6 |

### Live `GET /customer/stores`

Returns the same 4 merchants with the same IDs.

## What this proves

### 1. There is no approved merchant currently being excluded by `/customer/stores`

No merchant exists in:
- production DB approved set

but is missing from:
- production API `/customer/stores`

### 2. Empty products are not the exclusion condition

`مناحل البنا` appears in `/customer/stores` with:
- `status = APPROVED`
- `0` products

So the catalog query does **not** drop approved merchants just because they have no active products.

### 3. Product relation integrity is normal for returned merchants

For the merchants that have products:
- every returned product has `product.merchantId = merchant.id`
- every returned product has `status = ACTIVE`
- stock values are normal positive integers

### 4. No hidden catalog-only condition exists in current code path

Current `GET /customer/stores` query:

- `where: { status: "APPROVED" }`
- `include.products.where: { status: "ACTIVE" }`

There is no additional filter for:
- stock
- published
- hidden
- deleted
- customer_visible
- non-empty products

## Exact conclusion

The requested failure mode does not currently reproduce in the production backend query itself.

There is **no approved merchant row** in the current production database that is being filtered out by `GET /customer/stores`.

## Therefore

The statement:

- “an already APPROVED merchant is excluded from the production customer catalog query”

is not supported by the current production DB + API evidence gathered in this audit.

## Safe implication

Because no approved-but-excluded merchant currently exists in the live data:

- there is no safe backend query fix to apply here
- changing `/customer/stores` would be blind and unjustified

## Most likely remaining explanation

One of these is still true outside the current verified dataset:

1. the merchant thought to be approved is not actually approved in the production DB currently queried
2. the merchant was approved in a different environment or earlier state, but not in the current production rows
3. the observed seller-side merchant state came from a prior session/state that is no longer reflected in current production DB

## Required next proof to continue safely

To proceed with a targeted backend-only fix, the missing merchant must be identified by one of:

- exact `merchant.id`
- exact `user.phone`
- exact `storeName`

and that row must be shown to be:

- present in production DB
- `status = APPROVED`
- absent from `GET /customer/stores`

At that point, a precise backend fix can be applied safely.