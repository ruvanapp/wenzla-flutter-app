# FULL_RUNTIME_QA_REPORT — Customer App
Generated: 2026-05-11
Method:    Static code audit + APK analysis + Android manifest inspection
           Device R3CX207GH3L connected but remained UNAUTHORIZED — live adb/logcat
           tests could not be executed this session (see Section 9 for instructions).

---

## OVERALL LAUNCH READINESS VERDICT

  STATUS: NOT READY FOR GOOGLE PLAY — 2 hard blockers must be fixed first.
  After blockers are resolved: ready for internal testing with monitoring.

---

## SECTION 1 — CRITICAL ISSUES (Launch Blockers)

### CRIT-1 — Package name uses forbidden com.example prefix
Severity: CRITICAL — Google Play HARD REJECTION
File: android/app/build.gradle.kts  lines 20 + 43
       android/app/google-services.json  client[0].package_name

Current value:
  applicationId = "com.example.wenzla_customer_app"

Google Play policy rejects all apps where applicationId starts with "com.example".
The app CANNOT be uploaded to Google Play with this package name.

Also: google-services.json is configured for com.example.wenzla_customer_app.
Changing the package name requires:
  1. Update applicationId in build.gradle.kts
  2. Register the NEW package name in Firebase console
  3. Download a new google-services.json with the correct package name
  4. Rebuild the release APK

Suggested package name: com.wenzla.customer  OR  com.ruvanapp.wenzla.customer

Steps:
  build.gradle.kts line 43: applicationId = "com.wenzla.customer"
  build.gradle.kts line 20: namespace = "com.wenzla.customer"
  Firebase console → Project settings → Add Android app → new package name
  Download new google-services.json → replace apps/customer_app/android/app/google-services.json
  rebuild APK

---

### CRIT-2 — No session persistence (token lost on every cold start)
Severity: CRITICAL — fundamental UX blocker
File: lib/main.dart  line 185

Current code:
  String? token;  // in-memory only

The JWT token is stored in memory only.
Every time the user kills the app or the device restarts the app:
  - Token is gone
  - User state is gone
  - User must log in again via OTP

Expected behavior:
  - Token should survive app restarts
  - User should stay logged in unless they explicitly log out

Fix: Add flutter_secure_storage to pubspec.yaml
     On login:  await storage.write(key:'token', value: data['token'])
     On start:  token = await storage.read(key:'token')
     On logout: await storage.delete(key:'token')

---

### CRIT-3 — No cart persistence (cart lost on every cold start)
Severity: CRITICAL — direct revenue impact
File: lib/main.dart  line (cart List declaration)

Current code:
  List<dynamic> cart = [];  // in-memory only

Every cold start / app kill / device restart wipes the entire cart.
Users who add items and come back later find an empty cart.

Fix: Persist cart to SharedPreferences or flutter_secure_storage as JSON.
     Restore on initState. Clear only after confirmed successful order.

---

## SECTION 2 — HIGH SEVERITY ISSUES

### HIGH-1 — HTTP requests have no timeout
Severity: HIGH — hangs app on slow/dead network
File: lib/main.dart  lines 495 and 500

Current code:
  final res = await http.get(Uri.parse('$apiUrl$path'), ...);
  // no .timeout() call

If the Railway backend is unreachable, slow, or returning 504:
  The app hangs forever with no spinner, no error, no timeout.
  The user sees frozen UI indefinitely.

Fix:
  final res = await http
      .get(Uri.parse('$apiUrl$path'), headers: ...)
      .timeout(const Duration(seconds: 15), onTimeout: () {
        throw TimeoutException('Request timed out');
      });

Apply the same pattern to http.post and http.patch calls.

---

### HIGH-2 — postJson crashes when server returns non-JSON body
Severity: HIGH — turns HTTP errors into cryptic crashes
File: lib/main.dart  line 512

Current code:
  final msg = jsonDecode(res.body)['message'] ?? 'Error ${res.statusCode}';

If Railway returns a 502 HTML page:
  jsonDecode throws FormatException
  The catch block in callers receives a FormatException, not a clean message
  The user sees a raw exception string

Fix:
  String msg;
  try {
    msg = jsonDecode(res.body)['message'] ?? 'Error ${res.statusCode}';
  } catch (_) {
    msg = 'Error ${res.statusCode}';
  }
  throw Exception(msg);

---

### HIGH-3 — Dynamic IndexedStack children can cause range error
Severity: HIGH — runtime crash on navigation edge cases
File: lib/main.dart  line 595–604

Current code:
  IndexedStack(index: tabIndex, children: [
    homeView(),        // 0
    categoriesView(),  // 1
    searchView(),      // 2
    cartView(),        // 3
    ordersView(),      // 4
    loginView(),       // 5
    if (selectedStoreId != null) storeDetailView(),  // 6 — conditional
    if (selectedProduct != null) productDetailView(), // 7 — conditional
  ])

When selectedStoreId becomes null while tabIndex == 6:
  IndexedStack children list shrinks from 8 to 7 items
  tabIndex = 6 now points to productDetailView() which may be at index 6
  or causes "index out of range" if only 6 items remain

Flutter assertion: "index >= 0 && index < children.length"

Fix: Always include all children. Use Visibility or Offstage to hide/show:
  Offstage(offstage: selectedStoreId == null, child: storeDetailView()),
  Offstage(offstage: selectedProduct == null, child: productDetailView()),

---

### HIGH-4 — Google Maps API key exposed in AndroidManifest
Severity: HIGH — security risk + potential API abuse billing
File: android/app/src/main/AndroidManifest.xml  line 42

Current value:
  <meta-data android:name="com.google.android.geo.API_KEY"
             android:value="AIzaSyCXx9_myQYRRzIp6ik2puOm1rD-UxsY0mA"/>

This key is visible to anyone who decompiles the APK using apktool or jadx.
Without Android package restriction in Google Cloud Console, anyone can use it.

Fix:
  1. Open Google Cloud Console → APIs & Services → Credentials
  2. Restrict the API key to: Android apps only
  3. Add restriction: com.wenzla.customer (or new package name) with the SHA-1
  4. Rotate the key if it has been exposed publicly

---

### HIGH-5 — android:usesCleartextTraffic="true" in manifest
Severity: HIGH — unnecessary HTTP allowance, Play Store flag
File: android/app/src/main/AndroidManifest.xml  line 9

All production traffic uses HTTPS (wenzla-backend-production.up.railway.app).
Cleartext HTTP is not needed and allows plain-text network interception.

Google Play may flag this in security review.

Fix:
  Remove: android:usesCleartextTraffic="true"
  Or: replace with a network_security_config.xml that allows cleartext
      only for localhost/debug builds.

---

### HIGH-6 — ACCESS_BACKGROUND_LOCATION permission declared unnecessarily
Severity: HIGH — Play Store policy risk
File: android/app/src/main/AndroidManifest.xml  line 8

  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>

Background location requires an explicit Play Store policy justification.
The app only uses location during active map picker (foreground only).

Fix:
  Remove ACCESS_BACKGROUND_LOCATION from AndroidManifest.xml
  The app only needs ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION

---

### HIGH-7 — Missing mounted check after async setState calls
Severity: HIGH — "setState called after dispose" crashes
File: lib/main.dart  multiple locations

Affected locations:
  verifyOtp() — setState after await postJson
  checkoutCart() — setState + loadOrders after await
  registerCustomerFcmToken() — setState after await

When user navigates away while a network call is in progress,
the widget is disposed but setState is still called, causing:
  FlutterError: setState() called after dispose()

Fix (pattern for each):
  if (!mounted) return;
  setState(() { ... });

---

## SECTION 3 — MEDIUM SEVERITY ISSUES

### MED-1 — firebase_auth dependency included but unused
Severity: MEDIUM — unnecessary APK size (~2MB) + confusion
File: pubspec.yaml  line 9

  firebase_auth: ^5.7.0   # NOT USED

App uses Twilio OTP via backend, not Firebase Auth.
firebase_auth is imported in pubspec but never called in main.dart.

Fix: Remove firebase_auth from pubspec.yaml and run flutter pub get.

---

### MED-2 — Image.network() has no error handler
Severity: MEDIUM — broken image icon shown to users
File: lib/main.dart  lines 1191, 1224, 1471

Current code:
  Image.network(store['logoUrl'], height: 190, fit: BoxFit.cover)

If an image URL is broken (404, deleted, wrong URL), Flutter shows
a broken image icon with no fallback.

Fix:
  Image.network(
    url,
    errorBuilder: (_, __, ___) => Container(
      color: kGold.withOpacity(0.1),
      child: const Icon(Icons.store, size: 48, color: kGold),
    ),
  )

---

### MED-3 — No loading state indicators during API calls
Severity: MEDIUM — users see empty screens during data fetch
File: lib/main.dart  (no isLoading flag anywhere)

When the app opens and starts fetching stores/categories/products:
  Lists immediately show empty state
  No spinner, no shimmer, no "loading..." text
  Users think the app is broken

Fix:
  Add bool _loading = false;
  Set true before fetch, false in finally block
  Show CircularProgressIndicator in list views when _loading is true

---

### MED-4 — No pull-to-refresh on any screen
Severity: MEDIUM — users cannot manually refresh stale data
File: lib/main.dart  all list views

None of the list screens (stores, products, orders) have pull-to-refresh.
If data changes on the server, users see stale data until they restart the app.

Fix: Wrap each ListView with RefreshIndicator:
  RefreshIndicator(
    onRefresh: () => loadStores(),
    child: ListView(...)
  )

---

### MED-5 — storeFile uses absolute Mac Desktop path
Severity: MEDIUM — build will fail on any other machine or CI
File: android/key.properties

  storeFile=/Users/ahmedmohamedomer/Desktop/wenzla-keys/wenzla-release.keystore

This absolute path only works on one specific Mac.
If the project is moved, cloned, or built on CI, the build fails.

Fix: Move the keystore into the project at android/app/wenzla-release.keystore
     Update key.properties: storeFile=wenzla-release.keystore
     Add wenzla-release.keystore to .gitignore

---

### MED-6 — OTP phone field has no country code enforcement
Severity: MEDIUM — silent account creation issues
File: lib/main.dart  sendOtp()

  if (phone.length < 6) { ... }  // only length check

Raw user input without:
  - Country code prefix check
  - E.164 format enforcement
  - Egypt country code (+20) guidance

Different number formats (+201xxxxxxxxx vs 01xxxxxxxxx vs 201xxxxxxxxx)
can create duplicate accounts or fail silently.

Fix: Show country code prefix in the input field (default +20 for Egypt).
     Normalize phone before sending: if doesn't start with + add +20.

---

## SECTION 4 — LOW SEVERITY ISSUES

### LOW-1 — notification.hashCode used as notification ID
Severity: LOW — rare notification deduplication issue
File: lib/main.dart  notification handling

  notification.hashCode  used as local notification ID

hashCode collisions on the same device can cause one notification
to replace another silently.

Fix: Use a stable ID from message.data['notificationId'] or
     a monotonically incrementing counter stored in SharedPreferences.

---

### LOW-2 — RTL directionality not set globally
Severity: LOW — occasional LTR widget layout in Arabic UI
File: lib/main.dart  MaterialApp widget

App UI is fully in Arabic but textDirection: TextDirection.rtl
is not set on MaterialApp or key widgets.

Fix:
  MaterialApp(
    builder: (context, child) =>
      Directionality(textDirection: TextDirection.rtl, child: child!),
    ...
  )

---

### LOW-3 — App version 1.0.0+1 is fine but versionCode must never be reused
Severity: LOW — informational
File: pubspec.yaml  line 4

Google Play does not allow re-uploading a build with the same versionCode.
Current versionCode: 1 (from flutter.versionCode in pubspec).
Track version increments carefully with each Play Store upload.

---

### LOW-4 — No deep link configuration for notification tap
Severity: LOW — notification taps go to orders tab only
File: lib/main.dart  onMessageOpenedApp handler

Notification tap always navigates to ordersView (tab 4).
Cannot navigate to a specific order or notification detail.

Fix: Parse message.data['orderId'] or message.data['screen']
     and navigate to the appropriate screen.

---

### LOW-5 — No network connectivity check before API calls
Severity: LOW — unclear errors on offline device
File: lib/main.dart  getJson / postJson

When device is offline, http.get throws SocketException.
The error message shown to user is the raw exception string.

Fix: Add connectivity_plus package.
     Check for connectivity before API calls.
     Show "لا يوجد اتصال بالإنترنت" message instead of raw exception.

---

## SECTION 5 — APK ANALYSIS RESULTS

  APK file:    wenzla-customer-arm64-release.apk
  APK size:    18 MB
  Architecture: arm64-v8a (release)
  Build type:  Release (minified, obfuscated, signed)

  Package name:      com.example.wenzla_customer_app  ← BLOCKER
  Application label: ونزلا
  minSdkVersion:     23 (Android 6.0+) — acceptable
  targetSdkVersion:  as per flutter.targetSdkVersion
  Signing:           Release keystore (wenzla-release.keystore) — OK

  Firebase project:  wenzla-marketplace (728147437570) — OK
  FCM package match: com.example.wenzla_customer_app — matches APK but is com.example ← BLOCKER

---

## SECTION 6 — LIVE DEVICE TESTING STATUS

  Device connected: YES (R3CX207GH3L Samsung)
  Authorization:    UNAUTHORIZED — USB debugging permission dialog was not accepted on device

  Live tests not completed this session:
  - Cold start / warm start timing
  - OTP flow end-to-end
  - Cart → checkout → order submission
  - Push notification foreground/background
  - FCM token registration confirmation
  - Session loss on app kill (would confirm CRIT-2)
  - Cart loss on app kill (would confirm CRIT-3)
  - Image load failures
  - Network offline behavior

  How to authorize device for next session:
  1. Unlock the phone
  2. Unplug and replug the USB cable
  3. A dialog "Allow USB debugging?" should appear on the phone
  4. Tap "Allow" (optionally "Always allow from this computer")
  5. Run: adb devices    — should show "device" instead of "unauthorized"

---

## SECTION 7 — PRODUCTION LAUNCH BLOCKERS SUMMARY

| ID     | Issue                                     | Blocker Type           |
|--------|-------------------------------------------|------------------------|
| CRIT-1 | Package name com.example                  | Google Play hard reject |
| CRIT-2 | No session persistence                    | Core UX broken          |
| CRIT-3 | No cart persistence                       | Core revenue UX broken  |
| HIGH-4 | Maps API key exposed                      | Security/billing risk   |
| HIGH-5 | usesCleartextTraffic=true                 | Play Store policy flag  |
| HIGH-6 | ACCESS_BACKGROUND_LOCATION unnecessary    | Play Store policy risk  |

All 6 must be resolved before Google Play internal testing submission.

---

## SECTION 8 — RECOMMENDED FIX PRIORITY ORDER

Priority 1 — MUST DO BEFORE ANY PLAY STORE UPLOAD:
  1. Fix package name (CRIT-1): change to com.wenzla.customer
     Update Firebase, download new google-services.json, rebuild APK
  2. Remove ACCESS_BACKGROUND_LOCATION (HIGH-6): one-line manifest change
  3. Remove usesCleartextTraffic (HIGH-5): one-line manifest change

Priority 2 — MUST DO BEFORE GENERAL AVAILABILITY:
  4. Add session persistence (CRIT-2): flutter_secure_storage for token
  5. Add cart persistence (CRIT-3): SharedPreferences JSON
  6. Add HTTP timeout (HIGH-1): .timeout(15 seconds) on all http calls
  7. Fix postJson error body parsing (HIGH-2): try/catch jsonDecode

Priority 3 — FIX BEFORE PUBLIC LAUNCH:
  8. Fix IndexedStack dynamic children (HIGH-3): use Offstage
  9. Add mounted checks (HIGH-7): if (!mounted) return before setState
  10. Restrict Maps API key (HIGH-4): Google Cloud Console restriction
  11. Remove firebase_auth dependency (MED-1)
  12. Add image error builders (MED-2)
  13. Add loading indicators (MED-3)
  14. Add pull-to-refresh (MED-4)
  15. Fix keystore absolute path (MED-5)
  16. Add phone number normalization (MED-6)

Priority 4 — POLISH BEFORE PUBLIC:
  17. Fix notification ID collision risk (LOW-1)
  18. Set global RTL directionality (LOW-2)
  19. Add connectivity check (LOW-5)
  20. Add deep link notification navigation (LOW-4)

---

## SECTION 9 — MERCHANT APP COMPARISON NOTE

This report covers CUSTOMER APP only.
A separate QA audit is recommended for the merchant app (apps/merchant_app/)
using the same methodology once device authorization is confirmed.

---

## SECTION 10 — FILES REVIEWED

  apps/customer_app/lib/main.dart                    (1970 lines)
  apps/customer_app/android/app/build.gradle.kts
  apps/customer_app/android/app/src/main/AndroidManifest.xml
  apps/customer_app/android/app/google-services.json
  apps/customer_app/android/key.properties
  apps/customer_app/pubspec.yaml
  Desktop/wenzla-final-apks/wenzla-customer-arm64-release.apk (APK metadata)
  backend/src/routes/auth.js (for response shape cross-check)
