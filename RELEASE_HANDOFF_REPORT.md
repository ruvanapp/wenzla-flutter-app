# Release Handoff Report

## Stable baseline snapshot
- Project backup path:
  - `/Users/ahmedmohamedomer/Desktop/wenzla-seller-stable-baseline/project`

## Release artifacts
- Stable release APK path:
  - `apps/merchant_app/build/app/outputs/flutter-apk/app-release.apk`
- Stable release AAB path:
  - `apps/merchant_app/build/app/outputs/bundle/release/app-release.aab`

## Build verification
- Release APK build: **passed**
- Release AAB build: **passed**
- APK install on connected real Android device: **passed**
- AAB installability: not directly installable by ADB; artifact built successfully for Play internal testing

## Tested merchant credentials format
Use seeded staging merchant:
- phone: `+20100000002`
- password: `test123`

Also compatible request-layer formats already verified/implemented:
- `20100000002`
- `+20100000002`
- local Egyptian normalization support remains implemented for seller auth request layer

## Verified working seller flows
- seller login
- dashboard rendering
- products rendering
- orders rendering
- create product
- image upload
- valid order status update (`PENDING -> ACCEPTED`)
- logout
- login again after logout
- refreshed seeded data after re-login

## Known low-risk limitations
- Firebase Analytics micro-patch was not shipped in this frozen baseline because the rollout was intentionally halted under strict regression safety rules.
- Some broader production-hardening tasks requested earlier were intentionally not applied to preserve the verified stable seller flows.
- AAB was built successfully, but only APK install was directly verified on-device.

## Recommended soft-launch scope
- Start with internal testing / small trusted merchant cohort only
- Recommended initial scope:
  - 1–3 seeded or trusted real merchants
  - low daily order volume
  - manual monitoring of order status updates and uploads
- Keep rollout limited until post-internal-testing analytics/monitoring hardening is added

## Final recommendation
- Current seller app baseline is suitable for **internal testing and controlled soft launch** based on the verified seller flows above.
