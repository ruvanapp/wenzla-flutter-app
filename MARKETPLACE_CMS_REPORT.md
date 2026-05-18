# MARKETPLACE CMS REPORT

**Date:** 2026-05-18  
**Status:** ✅ COMPLETE — All systems operational  

---

## Overview

Extended the Home CMS from banners + promotions only into a **full dynamic marketplace CMS** supporting:

- **Banners** — hero slider (existing)
- **Promotions** — promotional cards (existing)
- **Categories** — NEW — full CRUD with image/icon/color, reorder, enable/disable
- **Featured Stores** — NEW — pin specific merchants, custom labels, images, reorder
- **Sections** — visibility toggles for home page layout (existing)

All home page content is now 100% backend-driven with no hardcoded data in the Flutter app.

---

## What Was Built

### 1. Database (Prisma — PostgreSQL)

**New models:**

```
HomeCategory {
  id, name, imageUrl, iconEmoji, colorHex, sortOrder, enabled, createdAt, updatedAt
}

FeaturedStore {
  id, merchantId → Merchant, customLabel, imageUrl, sortOrder, enabled, createdAt, updatedAt
}
```

Migration applied via `prisma db push` — zero downtime, no data loss.

---

### 2. Backend API Routes (`/home-cms`)

| Method   | Endpoint                          | Description                     |
|----------|-----------------------------------|---------------------------------|
| GET      | `/home-cms/public`                | Returns all home data (public)  |
| GET/POST | `/home-cms/categories`            | List / create categories        |
| PATCH    | `/home-cms/categories/:id`        | Update category                 |
| DELETE   | `/home-cms/categories/:id`        | Delete category                 |
| POST     | `/home-cms/categories/:id/image`  | Upload category image           |
| PUT      | `/home-cms/categories/reorder`    | Reorder (array of IDs)          |
| GET      | `/home-cms/merchants-list`        | APPROVED merchants for picker   |
| GET/POST | `/home-cms/featured-stores`       | List / pin stores               |
| PATCH    | `/home-cms/featured-stores/:id`   | Update featured store           |
| DELETE   | `/home-cms/featured-stores/:id`   | Remove from featured            |
| POST     | `/home-cms/featured-stores/:id/image` | Upload custom store image   |
| PUT      | `/home-cms/featured-stores/reorder` | Reorder featured stores       |

`/home-cms/public` now returns: `{ banners, promotions, sections, categories, featuredStores }`

---

### 3. Admin Dashboard (`admin.html`)

**New sub-tabs added to Home CMS panel:**

#### 🏷 Categories Tab
- Create category with name, emoji icon, background color, image upload, enable/disable toggle
- Drag-and-drop equivalent: ↑ / ↓ move buttons (CSP-safe, no inline handlers)
- Image upload with drag-and-drop drop zone + preview
- Card list with: upload image, edit, show/hide, delete buttons
- All buttons CSP-safe (event delegation via `data-action`)

#### ⭐ Featured Stores Tab
- Merchant picker dropdown (auto-populated from `/home-cms/merchants-list`)
- Custom label input, enable/disable toggle
- Optional custom image upload with drop zone + preview
- Card list: upload custom image, move up/down, show/hide, remove
- Merchant logo shown in cards when no custom image set

**Updated functions:**
- `setCmsTab()` — now handles `banners`, `promotions`, `categories`, `featured`, `sections`
- `loadCmsData()` — now loads all 5 endpoints in parallel
- `_attachCmsListDelegation()` — extended with `catList` and `featList` delegations
- `attachCmsEvents()` — wires new form buttons and drop zones
- `_showCmsPreview()` — handles `cat` and `feat` image types
- `_cmsUploadImg()` — routes to correct `/categories` or `/featured-stores` endpoint

---

### 4. Customer App (Flutter)

**`app_state.dart`:**
- Added `_homeCmsCategories` and `_featuredStores` lists
- Added `hasCmsCategories` and `hasFeaturedStores` getters
- `loadHomeCms()` now parses `categories` and `featuredStores` from `/home-cms/public`

**`home_screen.dart`:**
- `_buildCategoriesRow()` — uses CMS categories when `st.hasCmsCategories == true`, falls back to API categories otherwise
- Added `_buildCmsCategoryChip()` — renders emoji + color + optional image per CMS category item
- `_buildFeaturedStores()` — uses CMS featured stores when `st.hasFeaturedStores == true`, falls back to first 6 stores otherwise
- Featured stores card maps `customLabel` and merchant data from CMS entries

---

## Playwright QA Results

| Test                                           | Result |
|------------------------------------------------|--------|
| CMS tab opens + all 5 APIs load                | ✅ PASS |
| Categories sub-tab button exists               | ✅ PASS |
| Featured Stores sub-tab button exists          | ✅ PASS |
| Category form renders correctly                | ✅ PASS |
| Category save fires POST → 201                 | ✅ PASS |
| Category card renders after save               | ✅ PASS |
| Category reorder (↓ move) fires API            | ✅ PASS |
| Category toggle (show/hide) fires API          | ✅ PASS |
| Featured Stores — merchant picker renders      | ✅ PASS |
| Merchant picker populated (11 merchants found) | ✅ PASS |
| `/home-cms/public` includes `categories` array | ✅ PASS |
| `/home-cms/public` includes `featuredStores` array | ✅ PASS |
| Category delete fires API                      | ✅ PASS |
| **CSP violations**                             | ✅ **0** |

**Overall: 13/13 PASS**

---

## Real-Device Verification

Device: Samsung (R3CX207GH3L) — release APK installed  

After seeding 4 CMS categories and 4 featured stores via API:

- ✅ Categories section renders CMS data (emoji + color chips)
- ✅ Featured stores section shows CMS-ordered merchants
- ✅ Changes reflect instantly on app restart (no rebuild required)
- ✅ Fallback works: app shows API categories when CMS empty

---

## Production Seed Applied

**Categories created:**
1. مناحل عسل طبيعي — 🍯 #D4A437
2. عطارات أعشاب طبية — 🌿 #2D7A3A
3. عصارات زيوت طبيعية — 💧 #8B4513
4. حبوب بن وقهوة — ☕ #5C3317

**Featured Stores pinned:**
1. مناحل الأصالة
2. مناحل البركة
3. مناحل الرحمة
4. مناحل الريف

---

## Architecture

```
Admin Dashboard → POST /home-cms/categories     → DB: HomeCategory
                → POST /home-cms/featured-stores → DB: FeaturedStore
                → PUT  /home-cms/categories/reorder
                → PUT  /home-cms/featured-stores/reorder

Customer App    → GET  /home-cms/public          → returns categories + featuredStores
                → hasCmsCategories ? CMS categories : API categories (fallback)
                → hasFeaturedStores? CMS featured   : first-6 stores (fallback)
```

---

## No Breaking Changes

- Existing merchants, orders, products, and banners: untouched
- Backend `/customer/stores`, `/customer/categories`: unchanged
- Old home page behaviour preserved as automatic fallback
- Checkout flow, auth, and all existing APIs: unaffected
