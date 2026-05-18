# MERCHANT APP — PACKAGE RENAME REPORT

**Date:** 2026-05-11  
**Change:** `com.example.wenzla_merchant_app` → `com.wenzla.merchant`

---

## 1. EXACT FILES CHANGED

| File | What Changed |
|------|-------------|
| `android/app/build.gradle.kts` | `namespace` + `applicationId` |
| `android/app/google-services.json` | `package_name` for merchant entry |
| `android/gradle.properties` | Fixed duplicate JVM args + added locale + in-process Kotlin strategy |

---

## 2. OLD vs NEW PACKAGE NAME

| Field | Before | After |
|-------|--------|-------|
| `namespace` | `com.example.wenzla_merchant_app` | `com.wenzla.merchant` |
| `applicationId` | `com.example.wenzla_merchant_app` | `com.wenzla.merchant` |
| `google-services.json package_name` | `com.example.wenzla_merchant_app` | `com.wenzla.merchant` |
| APK verified package name | `com.example.wenzla_merchant_app` | `com.wenzla.merchant` ✓ |

---

## 3. FILE DIFF DETAILS

### `android/app/build.gradle.kts`
```kotlin
// BEFORE:
namespace = "com.example.wenzla_merchant_app"
applicationId = "com.example.wenzla_merchant_app"

// AFTER:
namespace = "com.wenzla.merchant"
applicationId = "com.wenzla.merchant"
```

### `android/app/google-services.json`
```json
// BEFORE:
"package_name": "com.example.wenzla_merchant_app"

// AFTER:
"package_name": "com.wenzla.merchant"
```
Note: The `mobilesdk_app_id` (`1:728147437570:android:007cca299a92e2dc20df1b`) is unchanged.

### `android/gradle.properties`
```properties
# BEFORE (duplicate entries, no locale, no in-process flag):
org.gradle.jvmargs=-Xmx8G -XX:MaxMetaspaceSize=4G ...
android.useAndroidX=true
android.enableJetifier=true

org.gradle.jvmargs=-Xmx8G -XX:MaxMetaspaceSize=4G ... -Duser.language=en -Duser.country=US -Dfile.encoding=UTF-8

# AFTER (single entry, locale set, in-process compilation):
org.gradle.jvmargs=-Xmx4G -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8 -Duser.language=en -Duser.country=US -Dkotlin.compiler.execution.strategy=in-process
android.useAndroidX=true
android.enableJetifier=true
```

---

## 4. BUILD RESULT

| Step | Result |
|------|--------|
| `flutter analyze` | **No issues** |
| `flutter build apk --release --split-per-abi` | **SUCCESS** |
| armeabi-v7a APK | 15.8 MB |
| arm64-v8a APK | **18.5 MB** ← Desktop copy |
| x86_64 APK | 19.6 MB |

---

## 5. APK VERIFICATION

| Check | Result |
|-------|--------|
| APK package name | `com.wenzla.merchant` ✓ |
| v1 JAR signing | Verified ✓ |
| v2 APK Signature Scheme | Verified ✓ |
| Certificate DN | `CN=mohamed elbana, OU=wenzla, O=wenzla, L=mansoura, ST=aga, C=EG` ✓ |
| Signed with release keystore | Yes (`wenzla-release.keystore`) |
| Debug config introduced | No |

---

## 6. APK OUTPUT PATH

- **Desktop:** `~/Desktop/wenzla-final-apks/wenzla-merchant-arm64-release.apk` (18 MB)
- **Source:** `apps/merchant_app/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`

---

## 7. WHAT WAS NOT CHANGED

| Area | Status |
|------|--------|
| Customer app | NOT touched |
| Backend | NOT touched |
| Business logic | NOT touched |
| Merchant auth/login flow | NOT touched |
| AndroidManifest.xml | NOT changed (no package attribute in manifest — package comes from build.gradle) |
| Signing config / key.properties | NOT changed |
| Production deployment | NOT deployed |

---

## 8. REMAINING PLAY STORE BLOCKERS

### Merchant App — Remaining Issues

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | Firebase Console still shows `com.example.wenzla_merchant_app` | **ACTION NEEDED** | Register `com.wenzla.merchant` in Firebase Console → Project Settings → Android Apps → Add App. Download new `google-services.json`. Until then FCM push notifications won't work on the renamed app. |
| 2 | App label is `wenzla_merchant_app` (snake_case) | Minor | Consider renaming to `Wenzla Merchant` in `AndroidManifest.xml` android:label or strings.xml for Play Store listing |
| 3 | `usesCleartextTraffic="true"` still present | Medium | If all APIs use HTTPS, remove this flag. Check if any internal service uses HTTP. |
| 4 | `ACCESS_BACKGROUND_LOCATION` in AndroidManifest | Medium | Remove if merchant app only needs foreground location. Requires Play Store justification if kept. |
| 5 | Merchant app has no session persistence | Medium | Token lives in memory only — app restart requires re-login. Low priority for merchant (B2B users). |

### Customer App — Already Resolved
- Package name: `com.wenzla.customer` ✓
- Firebase: `com.wenzla.customer` ✓
- Session persistence: implemented ✓
- Background location: removed ✓
- Cleartext traffic: removed ✓

---

## 9. FIREBASE ACTION REQUIRED (MANUAL)

Before publishing to Play Store or pushing to a real device using the renamed package, the owner must:

1. Open [Firebase Console](https://console.firebase.google.com) → Project `wenzla-marketplace`
2. Go to **Project Settings → Your Apps**
3. Add a new Android app with package name: `com.wenzla.merchant`
4. Download the new `google-services.json`
5. Replace `apps/merchant_app/android/app/google-services.json` with the new file
6. Rebuild the APK

Until this is done, the current APK will use the old `mobilesdk_app_id` which may cause FCM token registration to fail for the renamed package.

---

*Report generated: 2026-05-11 | Merchant app package rename*
