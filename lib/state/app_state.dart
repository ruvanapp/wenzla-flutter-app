import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../services/api_service.dart';
import '../services/analytics_service.dart';
import '../services/home_cache_service.dart';
import '../services/storage_service.dart';

enum AppScreen { home, orders, cart, login, storeDetail, productDetail }

/// Categorisation of why a checkout attempt failed.
/// Drives different UI handling in [_CheckoutSheetState._submit].
enum CheckoutErrorKind { authInvalid, cartInvalid, validation, server, network }

/// Structured error produced by [AppState.checkout] when an attempt fails.
/// The [message] is already user-facing Arabic — UIs can display it directly.
class CheckoutError {
  final CheckoutErrorKind kind;
  final int? statusCode;
  final String message;
  const CheckoutError({
    required this.kind,
    this.statusCode,
    required this.message,
  });
}

class AppState extends ChangeNotifier {
  // ── Navigation ───────────────────────────────────────────────────────────────
  AppScreen _screen            = AppScreen.home;
  int       _bottomIndex       = 0;
  int       _previousBottomIndex = 0; // saved tab before opening store/product

  AppScreen get screen       => _screen;
  int       get bottomIndex  => _bottomIndex;
  bool      get isAtRoot     => _screen == AppScreen.home && _bottomIndex == 0;

  void showScreen(AppScreen s, {int? bottomIndex}) {
    _screen      = s;
    if (bottomIndex != null) _bottomIndex = bottomIndex;
    notifyListeners();
  }

  void popToMain() {
    _selectedProduct   = null;
    _selectedStoreId   = null;
    _screen            = AppScreen.home;
    _bottomIndex       = 0;
    notifyListeners();
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  String?               _token;
  Map<String, dynamic>? _user;
  bool                  _checkoutSessionExpired = false;
  CheckoutError?        _lastCheckoutError;
  PackageInfo?          _cachedPackageInfo;

  String?               get token => _token;
  Map<String, dynamic>? get user  => _user;
  bool                  get isLoggedIn => _token != null;
  CheckoutError?        get lastCheckoutError => _lastCheckoutError;
  void consumeLastCheckoutError() {
    _lastCheckoutError = null;
  }
  double get walletBalance {
    final raw = _user?['walletBalance'];
    if (raw == null) return 0.0;
    return double.tryParse(raw.toString()) ?? 0.0;
  }

  Future<void> initAuth() async {
    final saved = await StorageService.loadAuth();
    _token = saved.token;
    _user  = saved.user;
    notifyListeners();
    if (isLoggedIn) {
      await refreshProfile(silent: true);
    }
    // Flush any FCM token that arrived before auth was restored
    if (isLoggedIn) await _flushFcmToken();
  }

  Future<bool> sendOtp(String phone) async {
    try {
      final api  = ApiService(token: _token);
      final norm = ApiService.normalisePhone(phone);
      final res  = await api.post('/auth/customer/send-otp', {'phone': norm});
      return res != null;
    } catch (_) {
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String otp, {String? referralCode}) async {
    try {
      final api  = ApiService(token: _token);
      final norm = ApiService.normalisePhone(phone);
      final body = <String, dynamic>{'phone': norm, 'code': otp};
      if (referralCode != null && referralCode.trim().isNotEmpty) {
        body['referralCode'] = referralCode.trim().toUpperCase();
      }
      final res  = await api.post('/auth/customer/verify-otp', body);
      if (res is Map && res['token'] != null) {
        _token = res['token'] as String;
        _user  = res['user']  as Map<String, dynamic>?;
        await StorageService.saveAuth(_token!, _user ?? {});
        await refreshProfile(silent: true);
        notifyListeners();
        // Flush any FCM token that arrived before login completed
        unawaited(_flushFcmToken());
        unawaited(AnalyticsService.instance.logCompleteRegistration());
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user  = null;
    _orders = [];
    _checkoutSessionExpired = false;
    await StorageService.clearAuth();
    showScreen(AppScreen.home, bottomIndex: 0);
  }

  bool consumeCheckoutSessionExpired() {
    final expired = _checkoutSessionExpired;
    _checkoutSessionExpired = false;
    return expired;
  }

  Future<void> forceLogoutToLogin() async {
    _token = null;
    _user = null;
    _orders = [];
    _checkingOut = false;
    _checkoutSessionExpired = false;
    await StorageService.clearAuth();
    showScreen(AppScreen.login, bottomIndex: 3);
  }

  // ── FCM token — pending-flush pattern ─────────────────────────────────────
  String? _pendingFcmToken;

  /// Called by main.dart whenever Firebase provides/refreshes a token.
  /// Caches the token and sends it to the backend if already logged in.
  Future<void> updateFcmToken(String fcmToken) async {
    _pendingFcmToken = fcmToken;   // always cache
    if (!isLoggedIn) return;       // will be flushed after login / auth restore
    await _flushFcmToken();
  }

  /// Sends the cached FCM token to the backend. No-op if no token or not logged in.
  Future<void> _flushFcmToken() async {
    final t = _pendingFcmToken;
    if (t == null || t.isEmpty || !isLoggedIn) return;
    try {
      final api = ApiService(token: _token);
      await api.patch('/auth/customer/fcm-token', {'fcmToken': t}, auth: true);
    } catch (_) {
      // Non-critical — notifications may not work but app continues
    }
  }

  Future<void> refreshProfile({bool silent = false}) async {
    if (!isLoggedIn) return;
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/profile', auth: true);
      if (res is Map<String, dynamic>) {
        _user = {
          ...?_user,
          ...res,
        };
        await StorageService.saveAuth(_token!, _user ?? {});
        if (!silent) notifyListeners();
      }
    } catch (_) {
      // Keep existing cached profile if refresh fails
    }
  }

  // ── Deep-link: pending order to open on Orders screen ────────────────────
  String? _pendingOpenOrderId;
  String? get pendingOpenOrderId => _pendingOpenOrderId;

  /// Set by notification tap handler in main.dart; cleared by OrdersScreen.
  void setPendingOpenOrderId(String? id) {
    _pendingOpenOrderId = id;
    notifyListeners();
  }

  void clearPendingOpenOrderId() {
    _pendingOpenOrderId = null;
  }

  // ── Stores ───────────────────────────────────────────────────────────────────
  List<dynamic> _stores        = [];
  List<dynamic> _categories    = [];
  bool          _loadingStores = false;

  List<dynamic> get stores        => _stores;
  List<dynamic> get categories    => _categories;
  bool          get loadingStores => _loadingStores;

  Future<void> loadStores() async {
    if (_loadingStores) return;

    // ── Stale-while-revalidate: show cached data immediately ──
    if (_stores.isEmpty) {
      final cached = await HomeCacheService.loadStores();
      if (cached != null && cached.isNotEmpty) {
        _stores = cached;
        notifyListeners();
      }
    }

    _loadingStores = true;
    // Don't notifyListeners here if we already have cached data (avoids flicker)
    if (_stores.isEmpty) notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/stores');
      _stores = res is List ? res : (res?['stores'] is List ? res['stores'] : []);
      // Save to cache in background
      unawaited(HomeCacheService.saveStores(_stores));
    } catch (_) {
      // Keep existing stores (cached or empty) if network fails
    } finally {
      _loadingStores = false;
      notifyListeners();
    }
  }

  Future<void> loadCategories() async {
    // ── Stale-while-revalidate ──
    if (_categories.isEmpty) {
      final cached = await HomeCacheService.loadCategories();
      if (cached != null && cached.isNotEmpty) {
        _categories = cached;
        notifyListeners();
      }
    }
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/categories');
      _categories = res is List ? res : [];
      unawaited(HomeCacheService.saveCategories(_categories));
      notifyListeners();
    } catch (_) {
      // silently fail — cached or static categories shown as fallback
    }
  }

  // ── Home CMS ─────────────────────────────────────────────────────────────────
  List<dynamic> _homeBanners       = [];
  List<dynamic> _homePromotions    = [];
  List<dynamic> _homeSections      = [];
  List<dynamic> _homeCmsCategories = [];
  List<dynamic> _featuredStores    = [];
  bool          _cmsLoading        = false;
  Map<String, dynamic>? _homePromoCard;

  List<dynamic> get homeBanners       => _homeBanners;
  List<dynamic> get homePromotions    => _homePromotions;
  List<dynamic> get homeSections      => _homeSections;
  List<dynamic> get homeCmsCategories => _homeCmsCategories;
  List<dynamic> get featuredStores    => _featuredStores;
  bool          get cmsLoading        => _cmsLoading;
  Map<String, dynamic>? get homePromoCard => _homePromoCard;

  Future<void> loadHomePromoCard() async {
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/settings/home-promo-card');
      if (res is Map<String, dynamic>) {
        _homePromoCard = res;
        notifyListeners();
      }
    } catch (_) { /* keep silent — card stays null and is hidden */ }
  }

  /// Whether the CMS has categories configured (to decide fallback vs CMS rendering)
  bool get hasCmsCategories => _homeCmsCategories.isNotEmpty;
  /// Whether the CMS has featured stores configured
  bool get hasFeaturedStores => _featuredStores.isNotEmpty;

  Future<void> loadHomeCms({bool force = false}) async {
    // Skip re-fetch if data is already loaded, unless forced (e.g. pull-to-refresh)
    if (!force && _homeBanners.isNotEmpty) return;

    // ── Stale-while-revalidate: show cached CMS immediately ──
    if (_homeBanners.isEmpty) {
      final cached = await HomeCacheService.loadCms();
      if (cached != null) {
        _homeBanners       = cached['banners']        is List ? List.from(cached['banners'])        : [];
        _homePromotions    = cached['promotions']     is List ? List.from(cached['promotions'])     : [];
        _homeSections      = cached['sections']       is List ? List.from(cached['sections'])       : [];
        _homeCmsCategories = cached['categories']     is List ? List.from(cached['categories'])     : [];
        _featuredStores    = cached['featuredStores'] is List ? List.from(cached['featuredStores']) : [];
        if (_homeBanners.isNotEmpty || _homeCmsCategories.isNotEmpty) {
          notifyListeners();
        }
      }
    }

    _cmsLoading = true;
    // Only notify loading if we have no cached data to show
    if (_homeBanners.isEmpty) notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/home-cms/public');
      if (res is Map) {
        _homeBanners       = res['banners']        is List ? List.from(res['banners'])        : [];
        _homePromotions    = res['promotions']     is List ? List.from(res['promotions'])     : [];
        _homeSections      = res['sections']       is List ? List.from(res['sections'])       : [];
        _homeCmsCategories = res['categories']     is List ? List.from(res['categories'])     : [];
        _featuredStores    = res['featuredStores'] is List ? List.from(res['featuredStores']) : [];
        // Save to disk cache
        unawaited(HomeCacheService.saveCms(Map<String, dynamic>.from(res)));
      }
    } catch (_) {
      // silently fail — cached or skeleton content remains
    } finally {
      _cmsLoading = false;
      notifyListeners();
    }
  }

  // ── Store Detail ─────────────────────────────────────────────────────────────
  String?               _selectedStoreId;
  Map<String, dynamic>? _selectedStore;
  List<dynamic>         _storeProducts = [];
  List<dynamic>         _storeReviews  = [];
  bool                  _loadingStore  = false;

  String?               get selectedStoreId => _selectedStoreId;
  Map<String, dynamic>? get selectedStore   => _selectedStore;
  List<dynamic>         get storeProducts   => _storeProducts;
  List<dynamic>         get storeReviews    => _storeReviews;
  bool                  get loadingStore    => _loadingStore;

  Future<void> openStore(String storeId) async {
    _previousBottomIndex = _bottomIndex;
    _selectedStoreId = storeId;
    _selectedStore   = null;
    _storeProducts   = [];
    _storeReviews    = [];
    _loadingStore    = true;
    showScreen(AppScreen.storeDetail);
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/stores/$storeId');
      debugPrint('[openStore] storeId=$storeId responseType=${res.runtimeType}');
      if (res is Map) {
        _selectedStore  = Map<String, dynamic>.from(res);
        _storeProducts  = res['products'] is List ? List.from(res['products']) : [];
        _storeReviews   = res['reviews']  is List ? List.from(res['reviews'])  : [];
        debugPrint('[openStore] selectedStore keys=${_selectedStore?.keys.toList()} products=${_storeProducts.length} reviews=${_storeReviews.length}');
      } else {
        _screen = _bottomIndexToScreen(_previousBottomIndex);
      }
    } catch (_) {
      _screen = _bottomIndexToScreen(_previousBottomIndex);
    } finally {
      _loadingStore = false;
      notifyListeners();
    }
  }

  Future<bool> openStoreWithData(Map<String, dynamic> store) async {
    final storeId = (store['id'] as String?)?.trim();
    if (storeId == null || storeId.isEmpty) return false;

    _previousBottomIndex = _bottomIndex;
    _selectedStoreId = storeId;
    _selectedStore = Map<String, dynamic>.from(store);
    _storeProducts = store['products'] is List ? List.from(store['products']) : [];
    _storeReviews = store['reviews'] is List ? List.from(store['reviews']) : [];
    _loadingStore = true;
    showScreen(AppScreen.storeDetail);

    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/stores/$storeId');
      debugPrint('[openStoreWithData] storeId=$storeId responseType=${res.runtimeType}');
      if (res is Map) {
        _selectedStore = Map<String, dynamic>.from(res);
        _storeProducts = res['products'] is List ? List.from(res['products']) : _storeProducts;
        _storeReviews = res['reviews'] is List ? List.from(res['reviews']) : _storeReviews;
        return true;
      }
      return true;
    } catch (_) {
      return _selectedStore != null;
    } finally {
      _loadingStore = false;
      notifyListeners();
    }
  }

  /// Back-navigate out of a store — restores the tab that was active before openStore().
  void closeStore() {
    _selectedStoreId = null;
    _selectedStore   = null;
    _storeProducts   = [];
    _storeReviews    = [];
    _screen      = _bottomIndexToScreen(_previousBottomIndex);
    _bottomIndex = _previousBottomIndex;
    notifyListeners();
  }

  AppScreen _bottomIndexToScreen(int i) {
    switch (i) {
      case 1:  return AppScreen.orders;
      case 2:  return AppScreen.cart;
      case 3:  return AppScreen.login;
      default: return AppScreen.home;
    }
  }

  Future<void> submitReview(String merchantId, int rating, String comment) async {
    if (!isLoggedIn) return;
    try {
      final api = ApiService(token: _token);
      await api.post(
        '/customer/reviews',
        {'merchantId': merchantId, 'rating': rating, 'comment': comment},
        auth: true,
      );
      await openStore(merchantId);
    } catch (_) {
      // Silently fail — review may not be saved but UI won't crash
    }
  }

  // ── Product Detail ───────────────────────────────────────────────────────────
  Map<String, dynamic>? _selectedProduct;
  Map<String, dynamic>? get selectedProduct => _selectedProduct;

  void openProduct(Map<String, dynamic> product) {
    _selectedProduct = product;
    showScreen(AppScreen.productDetail);
  }

  /// Open a product by ID — fetches from API to get full details.
  /// Safe fallback: if fetch fails, opens with minimal data (id only).
  Future<void> openProductById(String productId) async {
    if (productId.isEmpty) return;
    showScreen(AppScreen.productDetail);
    _selectedProduct = {'id': productId};
    notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/products/$productId');
      if (res is Map) {
        _selectedProduct = Map<String, dynamic>.from(res);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[openProductById] failed: $e');
    }
  }

  void closeProduct() {
    _selectedProduct = null;
    if (_selectedStoreId != null) {
      showScreen(AppScreen.storeDetail);
    } else {
      showScreen(AppScreen.home, bottomIndex: 0);
    }
  }

  // ── Cart ──────────────────────────────────────────────────────────────────────
  List<dynamic> _cart = [];
  List<dynamic> get cart     => _cart;
  int           get cartCount => _cart.fold<int>(0, (s, i) {
    final q = i['qty'];
    return s + (q is int ? q : (q is num ? q.toInt() : 1));
  });

  Future<void> loadCart() async {
    try {
      final loaded = await StorageService.loadCart();
      // StorageService already validates + coerces each item.
      // Wrap in List<dynamic> so runtime type allows spread-created replacements
      // in addToCart/updateCartQty without type errors.
      _cart = List<dynamic>.from(
        loaded.map((i) => Map<String, dynamic>.from(i)),
      );
    } catch (_) {
      // Ultimate fallback: any unexpected exception → clear only the cart,
      // never crash the app.
      _cart = [];
      await StorageService.clearCart();
    }
    notifyListeners();
  }

  Future<void> _saveCart() async {
    try {
      await StorageService.saveCart(_cart);
    } catch (_) {
      // Save failed — in-memory cart is fine; log omitted in release mode.
    }
  }

  // ── Single-store cart helper ──────────────────────────────────────────────
  /// Returns the merchantId of the first item currently in the cart, or null.
  String? get cartMerchantId =>
      _cart.isEmpty ? null : (_cart.first['merchantId'] as String?);

  /// Returns the store name from the first cart item, for display in CartStoreHeader.
  String get cartStoreName =>
      _cart.isEmpty ? '' : (_cart.first['storeName'] as String? ?? '');

  /// Returns the store logo URL from the first cart item, for display in CartStoreHeader.
  String? get cartStoreLogoUrl =>
      _cart.isEmpty ? null : (_cart.first['storeLogoUrl'] as String?);

  /// Adds [product] to the cart.
  /// Returns [true] if the item was added/incremented.
  /// Returns [false] if the cart already contains items from a DIFFERENT store
  /// (single-store cart enforcement).
  Map<String, dynamic> _normalizeCartItem(Map<String, dynamic> item) {
    final normalized = Map<String, dynamic>.from(item);
    final rawPrice = normalized['price'];
    if (rawPrice != null) {
      if (rawPrice is num) {
        normalized['price'] = rawPrice.toDouble();
      } else {
        normalized['price'] = double.tryParse(rawPrice.toString()) ?? 0.0;
      }
    }
    final rawQty = normalized['qty'];
    if (rawQty != null) {
      if (rawQty is int) {
        normalized['qty'] = rawQty;
      } else if (rawQty is num) {
        normalized['qty'] = rawQty.toInt();
      } else {
        normalized['qty'] = int.tryParse(rawQty.toString().split('.').first) ?? 1;
      }
    }
    return normalized;
  }

  bool addToCart(Map<String, dynamic> product, {int qty = 1}) {
    // ── Single-store enforcement ──────────────────────────────────────────
    if (_cart.isNotEmpty) {
      final existing  = cartMerchantId;
      final incoming  = product['merchantId'] as String?;
      if (existing != null && incoming != null && existing != incoming) {
        return false; // blocked — caller must show the Arabic error snackbar
      }
    }

    final idx = _cart.indexWhere((i) => (i as Map)['id'] == product['id']);
    if (idx >= 0) {
      // Use Map<String,dynamic>.from() so the spread never produces Map<dynamic,dynamic>
      final cur = _normalizeCartItem(Map<String, dynamic>.from(_cart[idx] as Map));
      _cart[idx] = _normalizeCartItem(
        <String, dynamic>{...cur, 'qty': ((cur['qty'] as int?) ?? 1) + qty},
      );
    } else {
      _cart.add(_normalizeCartItem(<String, dynamic>{...product, 'qty': qty}));
    }
    _saveCart();
    notifyListeners();
    unawaited(AnalyticsService.instance.logAddToCart(
      productId: (product['id'] ?? '') as String,
      productName: (product['name'] ?? '') as String,
      price: ((product['price'] is num ? product['price'] : 0) as num).toDouble(),
    ));
    return true;
  }

  void removeFromCart(String productId) {
    _cart.removeWhere((i) => (i as Map)['id'] == productId);
    _saveCart();
    notifyListeners();
  }

  void clearCart() {
    _cart = [];
    _saveCart();
    notifyListeners();
  }

  void updateCartQty(String productId, int qty) {
    if (qty <= 0) { removeFromCart(productId); return; }
    final idx = _cart.indexWhere((i) => (i as Map)['id'] == productId);
    if (idx >= 0) {
      final cur = _normalizeCartItem(Map<String, dynamic>.from(_cart[idx] as Map));
      _cart[idx] = _normalizeCartItem(<String, dynamic>{...cur, 'qty': qty});
      _saveCart();
      notifyListeners();
    }
  }

  double get cartTotal => _cart.fold(
    0.0,
    (s, i) => s + (double.tryParse(i['price']?.toString() ?? '0') ?? 0) * ((i['qty'] as int?) ?? 1),
  );

  // ── Selected shipping zone (synced from checkout sheet) ─────────────────────
  String? _selectedShippingZoneId;
  double? _selectedShippingFee;
  String? _selectedShippingZoneName;

  String? get selectedShippingZoneId => _selectedShippingZoneId;
  double? get selectedShippingFee => _selectedShippingFee;
  String? get selectedShippingZoneName => _selectedShippingZoneName;

  void setSelectedShippingZone({
    required String id,
    required double fee,
    String? name,
  }) {
    _selectedShippingZoneId = id;
    _selectedShippingFee = fee;
    _selectedShippingZoneName = name;
    notifyListeners();
  }

  void clearSelectedShippingZone() {
    _selectedShippingZoneId = null;
    _selectedShippingFee = null;
    _selectedShippingZoneName = null;
    notifyListeners();
  }

  // ── Checkout ──────────────────────────────────────────────────────────────────
  bool _checkingOut = false;
  bool get checkingOut => _checkingOut;

  /// Heuristic: server messages produced by the cart/stock/merchant validation
  /// path inside `prisma.$transaction` in `backend/src/routes/customer.js`
  /// (e.g. "out of stock", "Merchant is not available", "products are
  /// unavailable", "الحد الأدنى", "الشحن غير متاح", "منطقة الشحن غير صالحة").
  /// Detecting these lets the UI raise an actionable modal instead of a snackbar.
  bool _looksLikeCartInvalidMessage(String? msg) {
    if (msg == null) return false;
    final m = msg.toLowerCase();
    return m.contains('out of stock') ||
        m.contains('unavailable') ||
        m.contains('merchant is not available') ||
        msg.contains('غير متاح') ||
        msg.contains('غير متاحة') ||
        msg.contains('غير صالحة') ||
        msg.contains('الحد الأدنى') ||
        msg.contains('نفذت');
  }

  String _truncateForLog(String s, int max) =>
      s.length <= max ? s : '${s.substring(0, max)}…(truncated)';

  Future<PackageInfo> _getPackageInfo() async {
    return _cachedPackageInfo ??= await PackageInfo.fromPlatform();
  }

  Future<void> _logCheckoutFailure({
    required CheckoutErrorKind kind,
    required int? statusCode,
    required dynamic responseBody,
    required String shippingZoneId,
  }) async {
    try {
      final pkg = await _getPackageInfo();
      final bodyStr =
          _truncateForLog(jsonEncode(responseBody ?? const {}), 1024);
      await FirebaseCrashlytics.instance.recordError(
        Exception('checkout_${kind.name}_${statusCode ?? 'no_status'}'),
        StackTrace.current,
        reason: 'Checkout failure',
        fatal: false,
        information: <DiagnosticsNode>[
          DiagnosticsProperty<int?>('statusCode', statusCode),
          DiagnosticsProperty<String>('responseBody', bodyStr),
          DiagnosticsProperty<String?>('userId', _user?['id'] as String?),
          DiagnosticsProperty<String>(
              'appVersion', '${pkg.version}+${pkg.buildNumber}'),
          DiagnosticsProperty<String>('shippingZoneId', shippingZoneId),
          DiagnosticsProperty<int>('cartItemCount', _cart.length),
          DiagnosticsProperty<double>('cartTotal', cartTotal),
        ],
      );
    } catch (e) {
      // Logging itself must never break the checkout path.
      debugPrint('[CHECKOUT] Crashlytics recordError failed: $e');
    }
  }

  Future<bool> checkout({
    required String name,
    required String phone,
    required String address,
    required String shippingZoneId,
    String? notes,
    String? lat,
    String? lng,
    bool useWallet = false,
    double walletAmount = 0,
  }) async {
    const traceLabel = 'CHECKOUT';
    final stopwatch = Stopwatch()..start();
    int? responseStatusCode;
    void logResult(bool result, String reason) {
      debugPrint('[$traceLabel] checkout() returned $result ($reason)');
      debugPrint(
        '[$traceLabel] checkout() duration: ${(stopwatch.elapsedMilliseconds / 1000).toStringAsFixed(2)}s',
      );
    }

    debugPrint('[$traceLabel] checkout started');
    debugPrint('[$traceLabel] JWT token exists? ${(_token != null && _token!.isNotEmpty) ? 'yes' : 'no'}');
    _checkoutSessionExpired = false;
    _lastCheckoutError = null;

    if (!isLoggedIn || _cart.isEmpty) {
      logResult(false, 'preflight_failed');
      return false;
    }
    _checkingOut = true;
    notifyListeners();
    unawaited(AnalyticsService.instance.logInitiateCheckout(
      itemCount: _cart.length,
      totalPrice: cartTotal,
    ));
    final api = ApiService(token: _token);
    // Extract merchantId from first cart item (all items must belong to same merchant)
    final merchantId = _cart.first['merchantId'] as String?;
    if (merchantId == null) {
      _checkingOut = false;
      notifyListeners();
      logResult(false, 'missing_merchant_id');
      return false;
    }
    final items = _cart.map((i) => {
      'productId': i['id'],
      'quantity':  (i['qty'] as int?) ?? 1,
    }).toList();

    // Determine payment method
    String paymentMethod = 'CASH_ON_DELIVERY';
    if (useWallet && walletAmount > 0) {
      final cartTotalVal = cartTotal;
      if (walletAmount >= cartTotalVal) {
        paymentMethod = 'WALLET';
      } else {
        paymentMethod = 'PARTIAL_WALLET';
      }
    }

    try {
      final res = await api.post('/customer/orders', {
        'merchantId':      merchantId,
        'customerName':    name,
        'customerPhone':   ApiService.normalisePhone(phone),
        'deliveryAddress': address,
        'shippingZoneId':  shippingZoneId,
        'items':           items,
        'paymentMethod':   paymentMethod,
        if (useWallet && walletAmount > 0) 'walletAmount': walletAmount,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      }, auth: true, traceLabel: traceLabel, onStatusCode: (statusCode) {
        responseStatusCode = statusCode;
      });
      _checkingOut = false;

      // ── Success ────────────────────────────────────────────────────────────
      if (res is Map && res['id'] != null) {
        unawaited(AnalyticsService.instance.logPurchase(
          orderId: res['id'] as String,
          totalPrice: cartTotal,
          itemCount: _cart.length,
        ));
        _cart = [];
        await _saveCart();
        await loadOrders();
        if (useWallet && walletAmount > 0) {
          await refreshProfile(silent: true);
        }
        _lastCheckoutError = null;
        notifyListeners();
        logResult(true, 'order_created');
        return true;
      }

      // ── Failure: categorise ────────────────────────────────────────────────
      final code = responseStatusCode;
      final msgRaw = (res is Map ? res['message'] : null) as String?;
      final errorsArr = (res is Map ? res['errors'] : null);

      CheckoutErrorKind kind;
      String userMsg;

      if (code == 401 || code == 403) {
        kind = CheckoutErrorKind.authInvalid;
        userMsg = 'انتهت صلاحية الجلسة، برجاء تسجيل الدخول مرة أخرى';
        _checkoutSessionExpired = true; // legacy flag kept for any other consumer
      } else if (code == 400 && _looksLikeCartInvalidMessage(msgRaw)) {
        kind = CheckoutErrorKind.cartInvalid;
        userMsg = msgRaw ?? 'يوجد منتج غير متاح في السلة، يرجى تحديث السلة';
      } else if (code == 400) {
        kind = CheckoutErrorKind.validation;
        if (errorsArr is List && errorsArr.isNotEmpty) {
          final first = errorsArr.first;
          if (first is Map && first['message'] is String) {
            userMsg = first['message'] as String;
          } else {
            userMsg = msgRaw ?? 'بيانات الطلب غير صحيحة';
          }
        } else {
          userMsg = msgRaw ?? 'بيانات الطلب غير صحيحة';
        }
      } else {
        kind = CheckoutErrorKind.server;
        userMsg = msgRaw ?? 'تعذر إتمام الطلب، يرجى المحاولة لاحقاً';
      }

      _lastCheckoutError = CheckoutError(
        kind: kind,
        statusCode: code,
        message: userMsg,
      );
      unawaited(_logCheckoutFailure(
        kind: kind,
        statusCode: code,
        responseBody: res,
        shippingZoneId: shippingZoneId,
      ));
      notifyListeners();
      logResult(false, 'checkout_${kind.name}_${code ?? 'no_status'}');
      return false;
    } catch (e, st) {
      debugPrint('[$traceLabel] checkout() threw exception: $e');
      debugPrintStack(stackTrace: st);
      _checkingOut = false;
      _checkoutSessionExpired = false;
      _lastCheckoutError = CheckoutError(
        kind: CheckoutErrorKind.network,
        statusCode: null,
        message: 'تعذر الاتصال بالخادم — تحقق من الإنترنت ثم حاول مجددًا',
      );
      unawaited(_logCheckoutFailure(
        kind: CheckoutErrorKind.network,
        statusCode: null,
        responseBody: {'exception': e.toString()},
        shippingZoneId: shippingZoneId,
      ));
      notifyListeners();
      logResult(false, 'exception');
      return false;
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────────
  List<dynamic> _orders        = [];
  bool          _loadingOrders = false;

  List<dynamic> get orders        => _orders;
  bool          get loadingOrders => _loadingOrders;

  Future<void> loadOrders() async {
    if (!isLoggedIn) return;
    _loadingOrders = true;
    notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/orders', auth: true);
      _orders = res is List ? res : [];
    } catch (_) {
      // Keep existing orders if network fails
    } finally {
      _loadingOrders = false;
      notifyListeners();
    }
  }

  /// Silent background refresh — does NOT set [_loadingOrders] to true,
  /// so the orders list stays visible without a skeleton flash.
  /// Safe to call on every tab visit; skips if a full load is in progress.
  Future<void> silentRefreshOrders() async {
    if (!isLoggedIn || _loadingOrders) return;
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/orders', auth: true);
      if (res is List) {
        _orders = res;
        notifyListeners();
      }
    } catch (_) {
      // Silent — never interrupt UX for a background refresh failure
    }
  }

  Future<bool> cancelOrder(String orderId) async {
    if (!isLoggedIn) return false;
    try {
      final api = ApiService(token: _token);
      final res = await api.patch(
        '/customer/orders/$orderId/cancel', {}, auth: true,
      );
      if (res != null) { await loadOrders(); return true; }
      return false;
    } catch (_) {
      return false;
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────────
  List<dynamic> _searchResults  = [];
  bool          _searching      = false;
  String        _lastQuery      = '';

  List<dynamic> get searchResults => _searchResults;
  bool          get searching     => _searching;

  Future<void> search(String q) async {
    if (q.trim() == _lastQuery) return;
    _lastQuery     = q.trim();
    _searchResults = [];
    if (q.trim().isEmpty) { notifyListeners(); return; }
    _searching = true;
    notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/products/search?q=${Uri.encodeComponent(q)}');
      _searchResults = res is List ? res : [];
    } catch (_) {
      _searchResults = [];
    } finally {
      _searching = false;
      notifyListeners();
    }
  }

  void clearSearch() {
    _lastQuery     = '';
    _searchResults = [];
    notifyListeners();
  }
}
