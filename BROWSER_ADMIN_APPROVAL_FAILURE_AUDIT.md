## Browser Admin Approval Failure Audit

### Scope
- Focused only on why **manual browser approval** can fail while direct backend approval succeeds
- No frontend rebuilds
- No generic backend re-audit

## What was proven from the live deployed dashboard runtime

### Served admin runtime
- URL served: `https://wenzla-backend-production.up.railway.app/dashboard`
- Response headers include:
  - `cache-control: no-store`
- Served HTML contains inline admin runtime script
- Runtime API base is:
  - `var API = window.location.origin;`

### Deployed approval request wiring
From the served production `admin.html`:

- request method: `PATCH`
- request URL: `/admin/merchants/:id/status`
- auth token: sent as `Authorization: Bearer ${tok}`
- payload:

```json
{"status":"APPROVED"}
```

### Deployed approval handler

```js
async function updateMerchant(id,st){
  try{
    await api('/admin/merchants/'+id+'/status',{
      method:'PATCH',
      body:JSON.stringify({status:st})
    });
    await refreshAll();
  }catch(e){
    showToast('Failed to update merchant: '+e.message,'error');
  }
}
```

### Important implications
- No optimistic APPROVED state is applied before backend success
- No local merchant state is mutated first
- On failed request, the code should hit `catch` and show an error toast
- The approval target ID comes directly from:
  - `select data-id="{merchant.id}"`

## hola2 trace

### Merchant created
- `storeName = hola2`
- `merchant.id = cmp6ead6p009t5eujnwb8h7tg`
- initial DB status = `PENDING`

### What this means
- A clean target merchant exists for reproducing browser approval behavior

## What could NOT be fully reproduced here

This environment does **not** currently have a real browser automation runtime available:
- no Chrome
- no Chromium
- no Playwright

Therefore I could **not** literally click the deployed dashboard UI and capture:
- live browser network panel
- whether your browser sent the request
- whether the request was cancelled/blocked client-side
- whether your browser is running a stale different frontend bundle

## First exact failure point that is still unproven

The first layer that remains unproven is:

- **your real browser runtime before/at request dispatch**

Because everything server-side and in the served production `/dashboard` approval code path is wired correctly.

## Strongest current conclusion

### Not likely
- generic backend approval bug
- generic DB persistence bug
- optimistic UI masking in the served `/dashboard`
- wrong merchant ID selection in the served `/dashboard`

### Most likely remaining failure class
One of these browser/runtime-specific issues:

1. **wrong origin**
   - user is not actually using `https://wenzla-backend-production.up.railway.app/dashboard`

2. **different deployed frontend**
   - user is interacting with another admin UI deployment, not the served backend dashboard

3. **stale browser session/runtime**
   - old localStorage token
   - stale tab state
   - old opened page that is not the current served runtime

4. **request never sent / blocked in browser**
   - browser-side JS/runtime error
   - extension interference
   - devtools-disabled request observation gap

## Why stale browser cache is less likely for `/dashboard`

For the served backend dashboard:
- HTML is returned with `cache-control: no-store`
- approval logic is inline in the served HTML

So a classic cached external JS-bundle explanation is **less likely** for `/dashboard` itself.

## Most likely exact bug source now

The strongest remaining hypothesis is:

- **you are interacting with a different admin runtime/origin than the served production `/dashboard` page**, or
- **the browser request is failing before reaching backend and the failure is only visible in live DevTools**

## Required final proof to finish this audit

Open the exact page:

- `https://wenzla-backend-production.up.railway.app/dashboard`

Then for merchant `hola2` capture one approval click in DevTools:

- request URL
- request method
- request headers
- response status
- response body

If no request appears at all, the failure point is browser/runtime before dispatch.
If the request appears but targets a different host, the failure point is wrong origin/runtime.
If the request appears and returns non-200, the failure point is response handling/auth.

## Final concise verdict

For the served production `/dashboard` code path:
- approval logic is correct
- token is attached
- no optimistic state masking exists

So the browser failure is most likely **outside** the backend approval handler and **inside the specific browser/runtime/origin being used manually**.