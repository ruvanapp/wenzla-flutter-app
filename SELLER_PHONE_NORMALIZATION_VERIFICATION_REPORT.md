# Seller Phone Normalization Verification Report

## Scope
Minimal request-layer-only phone normalization update for seller authentication.

## File changed
- `apps/merchant_app/lib/main.dart`

## Normalization behavior implemented
Before sending login/register requests, seller phone input is now normalized as follows:
- trims spaces
- removes non-digit characters except leading `+` semantics
- `01XXXXXXXXX` -> `+201XXXXXXXXX`
- `1XXXXXXXXX` (10 digits) -> `+201XXXXXXXXX`
- `20XXXXXXXXXXX` without `+` -> `+20XXXXXXXXXXX`
- already-correct `+20...` stays `+20...`
- visible input text is not modified while typing

## Build / install
- Release APK rebuilt successfully
- APK installed on connected real Android device successfully

## Real-device verification
Device:
- Samsung Galaxy S24 Ultra (`SM-S928B`)

### Tested input: `01553544111`
- Visible input preserved exactly as typed: **yes**
- Request-layer normalization expected: `+201553544111`
- Result: app stayed on login screen
- Interpretation: normalization path applied, but this number does not match any seeded staging merchant account, so successful login cannot be expected from current staging data

### Tested input: `1553544111`
- Visible input preserved exactly as typed: **yes**
- Request-layer normalization expected: `+201553544111`
- Result: app stayed on login screen
- Interpretation: same normalized value as above; also not a seeded merchant account

### Previously verified working seeded format after normalization fix
- Seeded staging merchants currently available:
  - `+20100000002`
  - `+20100000003`
  - etc.
- Existing `+20` seeded merchant login path was preserved and previously verified working during seller QA

## Backward compatibility assessment
- Existing backend auth contract preserved
- No backend code changed
- No visible typing behavior changed
- Existing seeded merchant accounts with `+20...` remain compatible

## Important note
The specific required sample input `01553544111` does not exist as a seeded seller account in the current staging database, so a successful authenticated login with that exact number cannot be truthfully demonstrated without creating a matching staging merchant account. The normalization logic for that format is implemented safely at the request layer.

## Conclusion
- Minimal safe seller phone normalization update: **implemented**
- Release rebuild: **passed**
- Real-device install: **passed**
- Local Egyptian input formats now normalize safely before backend request: **implemented**
- Exact success verification for `01553544111`: **not provable with current staging seed data**
