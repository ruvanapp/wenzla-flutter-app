# Focused Seller Regression QA Report

## Scope
Regression QA on the physical Android device after the seller phone normalization update.

## Device / Environment
- Device: Samsung Galaxy S24 Ultra (`SM-S928B`)
- Android: 16
- Backend: staging only
- App: `com.wenzla.merchant`

## Code under verification
- `apps/merchant_app/lib/main.dart`
  - auth fields cleared on startup
  - merchant phone normalization at request layer only

## Goal verified
Explicitly verify that the new seller phone normalization logic did not break existing seeded seller authentication.

## Seeded merchant used
- Store: `TEST_Store 2`
- Backend phone: `+20100000002`
- Password: `test123`

## PASS / FAIL evidence

### PASS
#### 1. App remains stable after normalization changes
- Release APK rebuilt successfully.
- Installed successfully on the physical device.
- App launches successfully.
- No seller-app crash observed during regression attempts.

#### 2. Visible auth input is not mutated while typing
- Input fields display the raw value typed by the user.
- The app does not rewrite the phone text visibly during input.

#### 3. Request-layer normalization logic implemented safely
- `01XXXXXXXXX` -> `+20...`
- `1XXXXXXXXX` -> `+20...`
- `20...` without plus -> `+20...`
- existing `+20...` remains valid
- backend/auth architecture unchanged

### FAIL / BLOCKED
#### 1. Existing seeded seller authentication is not yet proven as passing in a clean regression run
- After reset and fresh relaunch, the app remained on the login screen during the latest capture.
- Clean post-reset pass using existing seeded merchant was **not truthfully completed end-to-end** in this run.

#### 2. Real-device login input remained vulnerable to concatenation during repeated automation attempts
- Evidence captured during regression run:
  - phone field became `2010000000201553544111`
- This shows repeated automated typing can still append if the field is not freshly reset before each attempt.
- Because of this, the exact seeded regression login could not be re-proven cleanly in the final pass.

#### 3. Dashboard / products CRUD / image upload / orders status update / logout were not fully re-proven in this final regression run
- These flows were previously partially verified in earlier real-device QA steps,
  but this focused regression pass did not complete them truthfully after a clean successful seeded login capture.

## Truthful assessment of normalization regression
- The normalization logic itself is implemented safely at request layer.
- It does **not** alter visible text during typing.
- It is **not yet fully proven** in this final run that existing seeded merchant login still succeeds end-to-end after the latest change, because the final clean seeded login capture was interrupted by input concatenation / state reset issues.

## Main regression risk still present
- Real-device automated input into the seller login screen is brittle and can append rather than replace values unless the app state is freshly reset and the field is manually cleared with reliable focus handling.

## Final verdict
- **Partial PASS** for the normalization implementation itself.
- **FAIL / NOT FULLY PROVEN** for the required seeded seller end-to-end regression authentication proof in this last run.
- Therefore, products CRUD, image upload, order status flow, and logout are **not honestly signed off** in this focused regression report.
