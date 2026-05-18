# Merchant App — Google Play Release v1.0.4 (Build 8)

**Date:** 2026-05-17  
**versionName:** 1.0.4  
**versionCode:** 8  
**Build mode:** release  
**AAB path:** `~/Desktop/WENZLA_FINAL_RELEASE_V3/merchant-app-release-v1.0.4+8.aab`  
**APK size:** 49 MB | **AAB size:** 24 MB  

---

## What's New in This Build

### Merchant Approval Sync (critical fix)
- Merchant status reflects **instantly** after admin approval — no reinstall or manual refresh needed
- Three sync mechanisms in priority order:
  1. **Socket.IO real-time** — `merchant:status_changed` event (~100 ms)
  2. **FCM push notification** — Arabic push delivered even when app is backgrounded/killed
  3. **Periodic polling fallback** — every 15 s while PENDING; auto-stops once APPROVED

### Admin Approval Push Notifications
- APPROVED → "تمت الموافقة على متجرك"
- BLOCKED  → "تم إيقاف تشغيل متجرك"
- REJECTED → "تم رفض طلب التسجيل"

### Order Status Push Notifications
- Both merchant route and admin dashboard route now send Arabic push to customers
- 3-layer FCM token resolution covers guest orders (no linked User record)

---

## Backend Commits

| Commit | Summary |
|--------|---------|
| `013f311` | Merchant route: FCM token fallback + Arabic order notifications |
| `20e5c55` | Admin route: full order notification pipeline |
| `e436621` | Approval sync: socket emit + push + `/merchant/status` endpoint |

---

## Play Console Upload Checklist

- Upload `merchant-app-release-v1.0.4+8.aab` to **Closed Testing** track
- versionCode **8** (previous was 7)
- Arabic release notes below

**Arabic:**
```
• تحديث حالة الموافقة على المتجر فوري بدون إعادة تسجيل الدخول
• إشعارات فورية عند موافقة الإدارة أو إيقاف المتجر
• تحسين إشعارات تحديث حالة الطلبات للعملاء
• إصلاحات في الأداء والاستقرار
```

**English:**
```
• Instant merchant approval status sync — no re-login needed
• Push notification when admin approves or blocks your store
• Improved order status notifications to customers
• Bug fixes and performance improvements
```
