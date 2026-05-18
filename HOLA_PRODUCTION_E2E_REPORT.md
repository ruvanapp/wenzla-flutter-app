## HOLA Production E2E Report

### Scope
- Traced merchant `hola` end-to-end in production
- Verified:
  - signup request
  - backend response
  - DB insert
  - auth/session persistence path
  - production merchant row creation
- No unrelated production rows modified

## 1. Signup request

Production request executed:

- `POST /auth/merchant/register`

Body:

```json
{
  "phone": "01150100111",
  "password": "100100",
  "storeName": "hola"
}
```

## 2. Backend response

Result:
- HTTP `201`

Response contained:
- merchant user created
- auth token returned
- refresh token returned
- embedded merchant object returned

Exact returned merchant:
- `merchant.id = cmp6doso800945euj37cfnc60`
- `storeName = hola`
- `status = PENDING`
- `userId = cmp6doso800935eujuibogcnw`

## 3. Production DB insert

Direct production DB verification confirmed the row exists immediately after signup.

### Persisted user row
- `user.id = cmp6doso800935eujuibogcnw`
- `phone = 01150100111`
- `role = MERCHANT`
- `createdAt = 2026-05-15T03:49:17.481Z`

### Persisted merchant row
- `merchant.id = cmp6doso800945euj37cfnc60`
- `userId = cmp6doso800935eujuibogcnw`
- `storeName = hola`
- `status = PENDING`
- `createdAt = 2026-05-15T03:49:17.481Z`
- `updatedAt = 2026-05-15T03:49:17.481Z`

## 4. Auth/session persistence path

### Backend
In `backend/src/routes/auth.js`:

- `POST /auth/merchant/register`
- creates nested merchant row inside:
  - `prisma.user.create({ ..., merchant: { create: ... } })`
- returns:
  - `buildAuthResponse(user, ...)`

### Seller app
In `apps/merchant_app/lib/main.dart`:

- `register()` sends:
  - `phone: normalizedPhone()`
  - `password`
  - `storeName`
- on success:
  - `applyAuth(data)`
  - `refreshAll()`

`applyAuth(data)` stores the live session in memory:
- `token = data['token']`
- `merchantId = data['user']['merchant']['id']`
- `profile = data['user']['merchant']`

So the seller app immediately reflects the merchant returned by backend auth response.

## 5. Production merchant row creation proof

This is fully proven.

### Exact flow proven
1. signup request sent
2. backend returned `201`
3. production DB row exists
4. merchant login succeeds for the same phone/password
5. login response maps to the same persisted merchant row

## 6. Merchant login consistency proof

Production request executed:

- `POST /auth/merchant/login`

Body:

```json
{
  "phone": "01150100111",
  "password": "100100"
}
```

Result:
- HTTP `200`

Returned merchant:
- `merchant.id = cmp6doso800945euj37cfnc60`
- `storeName = hola`
- `status = PENDING`

This exactly matches the production DB row.

## Final conclusion

For merchant `hola`, the production merchant registration flow works end-to-end:

- signup request: PASS
- backend response: PASS
- DB insert: PASS
- auth/session mapping: PASS
- production merchant row creation: PASS

### Exact merchant identity
- `merchant.id = cmp6doso800945euj37cfnc60`
- `user.id = cmp6doso800935eujuibogcnw`
- `phone = 01150100111`
- `storeName = hola`
- `status = PENDING`

### What this proves
- merchant row is definitely being created and persisted in production
- seller auth/login maps to that exact persisted row
- seller app state for this merchant is not fake; it matches the real DB row

### Remaining state
- `hola` is still `PENDING`
- it will not appear in customer catalog until explicitly approved