# Wenzla Multi-Vendor Marketplace

A production-ready MVP scaffold for a multi-vendor marketplace with:

- Customer Flutter mobile app
- Merchant Flutter mobile app
- Node.js backend with PostgreSQL and Prisma
- Firebase Cloud Messaging notification integration point
- Next.js admin dashboard

## Architecture

```text
apps/
  customer_app/       Flutter customer app
  merchant_app/       Flutter merchant app
backend/              Express + Prisma API
admin-dashboard/      Next.js admin dashboard
```

## Core Features

### Customer app

- Login with phone number
- Browse approved stores
- Search products
- See merchants selling a product
- Store page with products and reviews
- Place orders with customer details, address, phone, and notes
- Track order status

### Merchant app

- Merchant login
- Add, edit, delete products
- Upload product image URLs
- Receive new order events through Socket.IO
- Update order status
- View customer order details
- View total sales and commission owed

### Admin dashboard

- Approve or reject merchants
- Manage stores, products, categories, and orders
- Configure commission percentage
- View commission totals per merchant
- View operational reports
- Block merchants and products

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

### Admin dashboard

```bash
cd admin-dashboard
cp .env.example .env.local
npm install
npm run dev
```

### Flutter apps

```bash
cd apps/customer_app
flutter pub get
flutter run

cd ../merchant_app
flutter pub get
flutter run
```

## Default API

The backend listens on `http://localhost:4000`.

Authentication is intentionally lightweight for MVP development. Phone login returns a JWT. In production, replace the demo OTP step with Firebase Auth, Twilio Verify, or another verified phone authentication provider.
