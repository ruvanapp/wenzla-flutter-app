# SAFE_RELEASE_ARCHIVE

## 1. Exact stable baseline backup path
- `/Users/ahmedmohamedomer/Desktop/wenzla/wenzla-seller-stable-baseline/project`

## 2. Exact release APK path
- `apps/merchant_app/build/app/outputs/flutter-apk/app-release.apk`

## 3. Exact release AAB path
- `apps/merchant_app/build/app/outputs/bundle/release/app-release.aab`

## 4. Modified files that are part of the verified stable baseline
Primary verified seller baseline files:
- `apps/merchant_app/lib/main.dart`
- `apps/merchant_app/pubspec.yaml`
- `apps/merchant_app/android/settings.gradle.kts`
- `apps/merchant_app/android/app/src/main/AndroidManifest.xml`
- `apps/merchant_app/android/app/build.gradle.kts`
- `apps/merchant_app/android/key.properties`

Verification / handoff docs produced during this stable cycle:
- `REAL_DEVICE_SELLER_QA_REPORT.md`
- `UPDATED_FOCUSED_SELLER_QA_REPORT.md`
- `SELLER_DATA_RENDERING_DEBUG_REPORT.md`
- `SELLER_PHONE_NORMALIZATION_VERIFICATION_REPORT.md`
- `FINAL_OPERATIONAL_SELLER_QA_REPORT.md`
- `FINAL_GO_NO_GO_REPORT.md`
- `RELEASE_HANDOFF_REPORT.md`

## 5. Android / Kotlin / Gradle versions currently verified working
- Flutter: `3.29.3`
- Dart: `3.7.2`
- Android Gradle Plugin: `8.7.0`
- Kotlin plugin: `2.0.21`
- Java runtime used during build: `OpenJDK 21.0.10`

## 6. Firebase-related dependencies currently active
From `apps/merchant_app/pubspec.yaml`:
- `firebase_core: ^3.15.2`
- `firebase_analytics: ^11.3.3`
- `firebase_crashlytics: ^4.1.3`
- `firebase_messaging: ^15.2.5`
- `flutter_local_notifications: ^18.0.1`

Firebase-related code currently active in baseline:
- Firebase initialization in app startup
- Crashlytics global error capture
- Firebase Messaging permission request + token refresh + local notification handling
- Firebase Analytics login/signup/logout event logging

## 7. Required environment variables / API configuration for this stable build
Stable build command used a Dart define:
- `API_URL=https://wenzla-backend-staging.up.railway.app`

Important note:
- Source code default still points to production if no define is provided:
  - `String.fromEnvironment('API_URL', defaultValue: 'https://wenzla-backend-production.up.railway.app')`
- For reproducing this verified stable QA baseline exactly, always build with:
  - `--dart-define=API_URL=https://wenzla-backend-staging.up.railway.app`

Android signing config required:
- `apps/merchant_app/android/key.properties`
- current values reference:
  - alias: `wenzla`
  - keystore file: `/Users/ahmedmohamedomer/Desktop/wenzla/wenzla-keys/wenzla-release.keystore`

## 8. Current tested merchant login format
Verified accepted seller login formats in current baseline:
- `+20100000002`
- `20100000002`
- local normalization logic also supports Egyptian local patterns such as `01...` and `1...` at request layer

## 9. Current verified seller test credentials used during QA
Seeded staging merchant used during verified QA:
- phone: `+20100000002`
- password: `test123`
- store: `TEST_Store 2`

## 10. Known low-risk limitations
- `android:usesCleartextTraffic="true"` is still present in manifest and should be reviewed before broader production rollout.
- This stable baseline was verified primarily against **staging** backend, not production.
- Analytics / Crashlytics are integrated, but a broader production hardening rollout was intentionally halted to preserve stable flows.
- AAB was built successfully, but direct device install verification was done with APK only.

## 11. Exact commands to rebuild the stable APK and AAB later
From repository root:

### Rebuild stable APK
```bash
cd "apps/merchant_app" && flutter build apk --release --target-platform android-arm64 --dart-define=API_URL=https://wenzla-backend-staging.up.railway.app
```

### Rebuild stable AAB
```bash
cd "apps/merchant_app" && flutter build appbundle --release --dart-define=API_URL=https://wenzla-backend-staging.up.railway.app
```

### Optional sanity check before rebuild
```bash
cd "apps/merchant_app" && flutter pub get && flutter analyze lib/main.dart
```

## 12. Exact rollback recommendation if a future regression appears
Recommended rollback process:
1. Stop adding new patches immediately.
2. Restore seller app code from the frozen baseline backup:
   - `/Users/ahmedmohamedomer/Desktop/wenzla/wenzla-seller-stable-baseline/project`
3. Rebuild using the exact stable staging command above.
4. Reinstall the rebuilt release APK on a real Android device.
5. Re-run minimum smoke test:
   - login
   - dashboard
   - products
   - orders
   - create product
   - image upload
   - valid order status update
   - logout
   - relogin
6. If Git is used later, create a tag from the baseline before any new risky changes.

## 13. Whether any temporary / debug / test code still exists
Current truthful status:
- No temporary debug prints were intentionally added for the final stable seller baseline.
- There is QA-created seller data in staging backend (for example `QAProduct`) because operational QA created a real test product.
- The app still includes QA-facing user messages added during stabilization, such as clearer order update success/failure messages.

## 14. Whether any staging-only logic still exists
Yes.
- The verified stable release artifacts were built intentionally with:
  - `--dart-define=API_URL=https://wenzla-backend-staging.up.railway.app`
- That means the current verified release artifacts are **staging-targeted builds**.
- Source default API fallback still points to production if no build define is supplied.

## 15. Recommended Git tag / release name for this stable baseline
Recommended stable tag / release label:
- `seller-stable-baseline-2026-05-15`

Alternative human-readable release name:
- `Wenzla Seller Stable Baseline - Verified Real Device QA - 2026-05-15`

## Recovery safety summary
This archive represents the currently verified seller baseline with the following real-device flows confirmed:
- login
- dashboard rendering
- products rendering
- orders rendering
- create product
- image upload
- valid order status update
- logout
- login again
- refreshed data after re-login
