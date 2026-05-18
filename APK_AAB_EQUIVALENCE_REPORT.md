# APK / AAB EQUIVALENCE REPORT

## Scope checked

Compared the **currently tested APKs** against the **available Google Play upload AAB candidates** found locally.

## Tested APKs

- Customer tested APK: `apps/customer_app/build/app/outputs/flutter-apk/app-release.apk`
- Seller tested APK: `apps/merchant_app/build/app/outputs/flutter-apk/app-release.apk`

## Candidate uploaded AABs found locally

- Customer AAB: `~/Desktop/wenzla-final-apks/wenzla-customer-release.aab`
- Customer AAB: `~/Desktop/Wenzla_SAFE_RELEASE/apks/customer-app-release.aab`
- Customer AAB: `~/Desktop/Wenzla_SAFE_RELEASE/apks/customer-app-release-latest.aab`
- Merchant AAB: `~/Desktop/Wenzla_SAFE_RELEASE/apks/merchant-app-release.aab`

## 1. Package name

| Artifact | Package |
|---|---|
| Tested customer APK | `com.wenzla.customer` |
| Tested seller APK | `com.wenzla.merchant` |
| Older customer Play APK on Desktop | `com.wenzla.customer` |

## 2. versionName

| Artifact | versionName |
|---|---|
| Tested customer APK | `1.0.0` |
| Tested seller APK | `1.0.0` |
| Older customer Play APK on Desktop | `1.0.0` |

## 3. versionCode

| Artifact | versionCode |
|---|---|
| Tested customer APK | `1` |
| Tested seller APK | `1` |
| Older customer Play APK on Desktop | `2001` |

## 4. Backend environment

Verified from tested APK string contents:

| Artifact | Embedded backend |
|---|---|
| Tested customer APK | `https://wenzla-backend-staging.up.railway.app` |
| Tested seller APK | `https://wenzla-backend-staging.up.railway.app` |

Important:
- The currently tested APKs are **staging-targeted**
- They were **not** production-targeted Play release APKs

## 5. Git commit / build source

Result:
- Current directory is **not a git repo**
- No local git commit hash is available from this workspace

Build-source evidence available:
- Android config shows both apps use:
  - `versionName = flutter.versionName`
  - `versionCode = flutter.versionCode`
- Both current `pubspec.yaml` files declare:
  - `version: 1.0.0+1`

So the currently tested APKs were built from local source state corresponding to:
- `versionName = 1.0.0`
- `versionCode = 1`

## 6. Are the tested APKs byte/version equivalent to the Play-uploaded AABs?

### Customer app

**No — not equivalent to the older customer Play artifact found on Desktop.**

Reasons:
- Tested customer APK versionCode = `1`
- Older customer Play APK on Desktop versionCode = `2001`
- Tested customer APK targets **staging backend**
- Older Desktop Play upload set is from a different release cycle and different artifact lineage

### Seller app

**Cannot prove exact APK↔AAB byte equivalence from local files alone.**

What is known:
- Tested seller APK SHA-256:
  - `8637d2ba2612f4f443daddbc23700b5b176cc851ed999dda7111282b60addefa`
- Safe release seller APK has the exact same SHA-256:
  - `~/Desktop/Wenzla_SAFE_RELEASE/apks/merchant-app-release.apk`
- Safe release seller AAB exists:
  - `~/Desktop/Wenzla_SAFE_RELEASE/apks/merchant-app-release.aab`

This strongly suggests the seller tested APK matches the preserved stable release package set, but:
- APK and AAB are different file formats
- they cannot be byte-identical by definition
- exact “generated from the same build invocation” cannot be cryptographically proven here without build logs / manifest extraction from the AAB / Play Console metadata

## SHA-256 evidence

| Artifact | SHA-256 |
|---|---|
| Tested customer APK | `b9863511d46847d4dbd5dd7efddcf9cc3f614522914e4e5a754cefb2e6fc2068` |
| Tested seller APK | `8637d2ba2612f4f443daddbc23700b5b176cc851ed999dda7111282b60addefa` |
| Customer Desktop AAB | `e92cc15ac59a7de0065ace317260784aaf41770ac7c1fc07bc7795dcdd683b45` |
| Customer SAFE_RELEASE AAB | `38a080e5fd9aae44b3a05d1d32df5f918c03d33b6a05cde73a6b8c99780a77b6` |
| Customer SAFE_RELEASE latest AAB | `e92cc15ac59a7de0065ace317260784aaf41770ac7c1fc07bc7795dcdd683b45` |
| Merchant SAFE_RELEASE AAB | `4eed9b6c197bd10100be7843386b41d6e1bc9b8a8c1d09b941a78de9fd0d15f3` |
| Merchant SAFE_RELEASE APK | `8637d2ba2612f4f443daddbc23700b5b176cc851ed999dda7111282b60addefa` |

## Final concise conclusion

- **Customer tested APK is not the same release line as the older Play-upload customer AAB set** found locally.
- **Customer mismatch is confirmed** by:
  - different `versionCode`
  - different backend environment
- **Seller tested APK matches the preserved stable seller APK exactly by SHA-256**
- **Seller APK likely belongs to the same preserved release package set as the seller AAB**, but exact same-build provenance cannot be fully proven from local evidence alone
- **Byte-equivalence between APK and AAB is impossible by definition** because they are different artifact formats