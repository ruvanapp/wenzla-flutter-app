# Wenzla Marketplace — Full Project Documentation

> This document contains everything a developer needs to understand, run, and maintain the Wenzla project.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. API Endpoints
7. [Environment Variables](#7-environment-variables)
8. [Local Development Setup](#8-local-development-setup)
9. [Building the APKs](#9-building-the-apks)
10. [Deployment (Railway)](#10-deployment-railway)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Security Measures](#12-security-measures)
13. [Firebase & Twilio Setup](#13-firebase--twilio-setup)
14. [Signing Keys](#14-signing-keys)
15. [Known Limitations & Future Work](#15-known-limitations--future-work)

---

## 1. Project Overview

Wenzla is a multi-vendor marketplace with three parts:

| Part | Description |
|------|-------------|
| **Customer App** | Flutter Android app — browse stores, search products, place orders, track status |
| **Merchant App** | Flutter Android app — manage products, receive orders in real-time, view sales |
| **Admin Dashboard** | Web dashboard (HTML/JS, served by the backend) — approve merchants, manage everything, set commissions, manage employees |

**Business model:** Admin earns a commission percentage from every delivered order.
**Currency:** Egyptian Pound (EGP)

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile apps | Flutter (Dart) |
| Backend API | Node.js (ESM), Express.js |
| Database | PostgreSQL (via Prisma ORM) |
| Real-time | Socket.IO |
| Authentication | JWT (jsonwebtoken) |
| OTP / SMS | Twilio Verify |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Image uploads | Multer (local disk) |
| Admin dashboard | Single HTML file (vanilla JS), served by Express |
| Hosting | Railway (backend + PostgreSQL) |
| Security | Helmet, express-rate-limit, bcryptjs, Zod validation |

---

## 3. Architecture

```
Customer App (Flutter)  ──────────────────┐
                                          │  HTTPS + WSS
Merchant App (Flutter)  ──────────────────┤──► Railway Backend (Node.js/Express)
                                          │         │
Admin Dashboard (Browser) ────────────────┘    PostgreSQL DB (Prisma)
                                               │
                                          Twilio (OTP)
                                          Firebase (Push)
```

**Real-time flow:**
- Merchant app connects to Socket.IO room `merchant:{merchantId}` after login
- When a customer places an order, backend emits `new_order` to that room
- Backend also sends FCM push notification as fallback

---

## 4. Project Structure

```
wenzla/
├── apps/
│   ├── customer_app/
│   │   ├── lib/main.dart           ← Entire customer app (~1000 lines)
│   │   └── android/
│   │       ├── app/build.gradle.kts
│   │       ├── app/google-services.json  ← Firebase config
│   │       └── key.properties            ← Signing keystore config
│   └── merchant_app/
│       ├── lib/main.dart           ← Entire merchant app (~900 lines)
│       └── android/
│           ├── app/build.gradle.kts
│           └── key.properties
│
├── backend/                        ← Node.js backend (local copy)
│   ├── src/
│   │   ├── server.js               ← Express + Socket.IO entry point
│   │   ├── routes/
│   │   │   ├── auth.js             ← Login, OTP, registration
│   │   │   ├── customer.js         ← Store browsing, orders
│   │   │   ├── merchant.js         ← Product/order management
│   │   │   ├── admin.js            ← Admin CRUD
│   │   │   └── uploads.js          ← Image upload endpoint
│   │   ├── middleware/
│   │   │   ├── auth.js             ← JWT + permission checks
│   │   │   └── rateLimiter.js      ← Rate limiters
│   │   ├── config/
│   │   │   ├── prisma.js           ← Prisma client
│   │   │   └── firebase.js         ← Firebase Admin SDK
│   │   ├── services/
│   │   │   ├── audit.js            ← Admin activity logging
│   │   │   ├── notifications.js    ← FCM push
│   │   │   ├── settings.js         ← Global settings
│   │   │   └── twilio.js           ← OTP send/verify
│   │   └── utils/auth.js           ← JWT sign helper
│   ├── prisma/
│   │   ├── schema.prisma           ← Database schema
│   │   └── seed.js                 ← Seeds admin user on deploy
│   ├── admin.html                  ← Admin dashboard (served at /dashboard)
│   └── privacy-policy.html         ← Privacy policy (served at /privacy)
```

> **IMPORTANT:** The deployed production code is in a separate GitHub repo:
> `https://github.com/ruvanapp/wenzla-backend`
> All production changes must be pushed there (not to the local `backend/` folder).

---

## 5. Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| phone | String? unique | Customer & merchant login |
| username | String? | Admin/employee login |
| name | String? | Display name |
| password | String? | bcrypt hash |
| role | Enum | CUSTOMER / MERCHANT / ADMIN |
| permissions | Json? | null=super admin, ["all"]=full employee, ["orders","merchants"]=limited |
| fcmToken | String? | Firebase push token |

### Merchant
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| userId | String unique | FK → User |
| storeName | String | |
| commissionPercentage | Decimal? | Overrides global % if set |
| status | Enum | PENDING / APPROVED / REJECTED / BLOCKED |

### Product
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| merchantId | String | FK → Merchant |
| categoryId | String? | FK → Category |
| name | String | Indexed |
| weight | String? | e.g. "500g", "1kg" |
| price | Decimal(10,2) | In EGP |
| imageUrl | String? | /uploads/... or full URL |
| stock | Int | |
| status | Enum | ACTIVE / BLOCKED |

### Order
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| customerId | String? | FK → User |
| merchantId | String | FK → Merchant |
| customerName | String | Denormalized |
| customerPhone | String | |
| deliveryAddress | String | |
| status | Enum | PENDING → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED / CANCELLED |
| subtotal | Decimal(10,2) | |
| commissionPercentage | Decimal(5,2) | Snapshot at order time |
| commissionAmount | Decimal(10,2) | subtotal × % / 100 |
| total | Decimal(10,2) | |
| paymentMethod | Enum | CASH_ON_DELIVERY only |

### Other Tables
- `OrderItem` — line items (productId, quantity, unitPrice, total)
- `Category` — product categories (admin managed)
- `Review` — merchant reviews (rating 1-5, comment)
- `AdminActivity` — full audit log (actor, action, entity, timestamp)
- `Setting` — key/value store (e.g. commissionPercentage)

---

## 6. API Endpoints

**Base URL:** `https://wenzla-backend-production.up.railway.app`

### Auth — /auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/customer/send-otp | — | Send OTP via Twilio |
| POST | /auth/customer/verify-otp | — | Verify OTP, return JWT |
| POST | /auth/customer/firebase | — | Login via Firebase ID token |
| POST | /auth/merchant/register | — | Register new merchant (status=PENDING) |
| POST | /auth/merchant/login | — | Merchant login, return JWT |
| POST | /auth/admin/login | — | Admin/employee login, return JWT |

### Customer — /customer
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /customer/categories | — | List categories |
| GET | /customer/stores | — | List approved merchants |
| GET | /customer/stores/:id | — | Merchant + products + reviews |
| GET | /customer/products/search?q= | — | Search products |
| GET | /customer/orders | Customer | My orders |
| GET | /customer/orders/:id | Customer | Order detail |
| POST | /customer/orders | Customer | Place order |
| POST | /customer/reviews | Customer | Submit review |

**POST /customer/orders body:**
```json
{
  "merchantId": "...",
  "customerName": "Ahmed Mohamed",
  "customerPhone": "+201001234567",
  "deliveryAddress": "123 Street, Cairo",
  "notes": "optional",
  "items": [{ "productId": "...", "quantity": 2 }]
}
```

### Merchant — /merchant
> All require MERCHANT JWT

| Method | Path | Description |
|--------|------|-------------|
| GET | /merchant/profile | Own store info |
| PATCH | /merchant/profile | Update store |
| GET | /merchant/products | Own products |
| POST | /merchant/products | Add product |
| PATCH | /merchant/products/:id | Edit product |
| DELETE | /merchant/products/:id | Delete product |
| GET | /merchant/orders | Incoming orders |
| PATCH | /merchant/orders/:id/status | Update order status |
| GET | /merchant/sales/summary | Sales + commission owed |

### Uploads — /uploads
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /uploads/product-image | Merchant or Admin | Upload image (field: `image`) → returns `{ url: "/uploads/..." }` |

### Admin — /admin
> All require ADMIN JWT. Permission column = what the employee needs.

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | /admin/overview | any | Stats summary |
| GET | /admin/employees | employees | List employees |
| POST | /admin/employees | employees | Create employee |
| PATCH | /admin/employees/:id/permissions | employees | Update permissions |
| PATCH | /admin/employees/:id/password | employees | Reset password |
| GET | /admin/activities | activity | Audit log |
| GET | /admin/merchants | merchants | List merchants |
| PATCH | /admin/merchants/:id | merchants | Edit merchant |
| PATCH | /admin/merchants/:id/status | merchants | Approve/reject/block |
| PATCH | /admin/merchants/:id/commission | commissions | Per-merchant commission % |
| GET | /admin/products | products | All products |
| POST | /admin/products | products | Create product |
| PATCH | /admin/products/:id | products | Edit product |
| DELETE | /admin/products/:id | products | Delete product |
| PATCH | /admin/products/:id/status | products | Block/unblock |
| GET | /admin/orders | orders | All orders |
| PATCH | /admin/orders/:id/status | orders | Update status |
| GET | /admin/categories | any | List categories |
| POST | /admin/categories | any | Create category |
| PATCH | /admin/categories/:id | any | Rename |
| DELETE | /admin/categories/:id | any | Delete |
| GET | /admin/settings/commission | commissions | Global commission % |
| PUT | /admin/settings/commission | commissions | Set global % |
| GET | /admin/commissions | commissions | Per-merchant commission data |
| GET | /admin/reports | any | Monthly revenue reports |

### Other
| GET | /health | — | `{"status":"ok"}` |
| GET | /dashboard | — | Admin dashboard HTML |
| GET | /privacy | — | Privacy policy |

---

## 7. Environment Variables

Set in Railway → Service → Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | YES | PostgreSQL connection (auto-set by Railway) |
| JWT_SECRET | YES | 64+ char random string for signing tokens |
| TWILIO_ACCOUNT_SID | YES | Starts with AC... |
| TWILIO_AUTH_TOKEN | YES | Twilio secret token |
| TWILIO_VERIFY_SERVICE_SID | YES | Starts with VA... |
| FIREBASE_PROJECT_ID | YES | Firebase project ID |
| FIREBASE_CLIENT_EMAIL | YES | Service account email |
| FIREBASE_PRIVATE_KEY | YES | Private key (include newlines as \n) |
| ENABLE_DEV_OTP | DO NOT SET | Bypasses OTP — dev only, never in production |
| PORT | Optional | Defaults to 4000 |

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 8. Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (local or use Railway DB URL)
- Flutter SDK 3.x
- Android Studio + emulator

### Backend
```bash
cd backend
cp .env.example .env      # fill in all variables
npm install
npx prisma db push        # create tables
node prisma/seed.js       # create default admin
npm run dev               # starts on port 4000
```

Default admin after seed:
- Username: `admin`
- Password: `Admin@123456`

### Flutter Apps
```bash
cd apps/customer_app
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4000   # emulator
# or for real device (same WiFi):
flutter run --dart-define=API_URL=http://YOUR_MAC_IP:4000
```

---

## 9. Building the APKs

```bash
# Customer app
cd apps/customer_app
flutter build apk --release \
  --dart-define=API_URL=https://wenzla-backend-production.up.railway.app

# Merchant app
cd apps/merchant_app
flutter build apk --release \
  --dart-define=API_URL=https://wenzla-backend-production.up.railway.app
```

Output: `build/app/outputs/flutter-apk/app-release.apk`

**Keystore (already set up):**
```
File:     ~/Desktop/wenzla-keys/wenzla-release.keystore
Alias:    wenzla
Password: Wenzla2026#
```

`key.properties` is already placed in both `android/` folders.

> BACKUP the `.keystore` file. If lost, you cannot update the app on Google Play.

---

## 10. Deployment (Railway)

**Live URL:** `https://wenzla-backend-production.up.railway.app`
**GitHub repo:** `https://github.com/ruvanapp/wenzla-backend`

Every `git push origin main` triggers automatic redeploy (~2 min).

Start script runs on every deploy:
```bash
prisma db push && node prisma/seed.js && node src/server.js
```

**Making a production change:**
```bash
git clone git@github.com:ruvanapp/wenzla-backend.git
cd wenzla-backend
# make changes
git add . && git commit -m "description"
git push origin main
```

**Rules for schema changes:**
- Only additive changes (new columns, new tables)
- Never rename or delete columns with existing data
- Nullable new columns only (no new required columns on existing tables)

---

## 11. Admin Dashboard

**URL:** `https://wenzla-backend-production.up.railway.app/dashboard`

### Employee Permissions
Set `permissions` as JSON array when creating an employee:

| Value | Access |
|-------|--------|
| `["all"]` | Full access |
| `["orders"]` | Orders tab only |
| `["merchants"]` | Merchants tab only |
| `["products"]` | Products tab only |
| `["commissions"]` | Commissions tab only |
| `["employees"]` | Employees tab only |
| `["activity"]` | Audit log only |

Multiple: `["orders", "merchants", "products"]`

**Security:**
- Super admin (`permissions = null`) cannot be modified by employees
- All actions logged in audit trail with username + timestamp

---

## 12. Security Measures

| Measure | Detail |
|---------|--------|
| JWT | 7-day expiry, strong secret, verified on every protected route |
| Passwords | bcrypt, 10 salt rounds |
| Rate limiting | Auth: 20/15min. Login/OTP: 5/15min per IP |
| Input validation | Zod on all inputs |
| SQL injection | Prisma parameterized queries only |
| HTTP headers | Helmet (CSP, HSTS, X-Frame-Options) |
| CORS | Railway domain only |
| Role separation | CUSTOMER / MERCHANT / ADMIN enforced per route |
| Permission checks | Per-endpoint for employees |
| Super admin guard | Cannot modify null-permission account via employee API |
| Upload validation | Images only, 5MB limit |
| Audit log | Every admin action recorded |

---

## 13. Firebase & Twilio Setup

### Twilio OTP
1. Create account at twilio.com
2. Get Account SID + Auth Token from Console
3. Create Verify Service → copy Service SID (VA...)
4. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` in Railway

### Firebase Push Notifications
1. Create project at console.firebase.google.com
2. Add Android app — package name: `com.example.wenzla_customer_app`
3. Download `google-services.json` → place in `apps/customer_app/android/app/`
4. Project Settings → Service Accounts → Generate new private key (JSON)
5. Set in Railway: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

---

## 14. Signing Keys

| File | Purpose |
|------|---------|
| `~/Desktop/wenzla-keys/wenzla-release.keystore` | Android signing keystore |
| `~/Desktop/wenzla-keys/key.properties` | Referenced by Gradle build |

```
Alias:     wenzla
Password:  Wenzla2026#
Validity:  10,000 days (~27 years)
Algorithm: RSA 2048-bit
```

---

## 15. Known Limitations & Future Work

| Item | Priority | Notes |
|------|----------|-------|
| Payment gateway | High | Cash-on-delivery only. Add Paymob/Fawry for Egypt |
| Image hosting | High | Stored on Railway disk — lost on redeploy. Migrate to Cloudinary or S3 |
| PostgreSQL backups | High | Enable in Railway dashboard before launch |
| iOS support | Low | Android only. iOS needs Apple Developer account |
| App icon | Medium | Using Flutter default. Replace before Play Store |
| Google Play | — | Need Play Developer account ($25). Upload signed APK + store listing + privacy policy |

---

## Quick Reference

| Item | Value |
|------|-------|
| Backend URL | https://wenzla-backend-production.up.railway.app |
| Dashboard | /dashboard |
| Health check | /health |
| Privacy policy | /privacy |
| GitHub repo | https://github.com/ruvanapp/wenzla-backend |
| Admin username | admin |
| Keystore password | Wenzla2026# |
| Keystore alias | wenzla |
| Customer package | com.example.wenzla_customer_app |
| Merchant package | com.example.wenzla_merchant_app |

---
*Document generated May 2026*
