import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

enum AppScreen { home, orders, cart, login, storeDetail, productDetail }

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

  String?               get token => _token;
  Map<String, dynamic>? get user  => _user;
  bool                  get isLoggedIn => _token != null;

  Future<void> initAuth() async {
    final saved = await StorageService.loadAuth();
    _token = saved.token;
    _user  = saved.user;
    notifyListeners();
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

  Future<bool> verifyOtp(String phone, String otp) async {
    try {
      final api  = ApiService(token: _token);
      final norm = ApiService.normalisePhone(phone);
      final res  = await api.post('/auth/customer/verify-otp', {'phone': norm, 'code': otp});
      if (res is Map && res['token'] != null) {
        _token = res['token'] as String;
        _user  = res['user']  as Map<String, dynamic>?;
        await StorageService.saveAuth(_token!, _user ?? {});
        notifyListeners();
        // Flush any FCM token that arrived before login completed
        unawaited(_flushFcmToken());
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
    await StorageService.clearAuth();
    showScreen(AppScreen.home, bottomIndex: 0);
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
    _loadingStores = true;
    notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/stores');
      _stores = res is List ? res : (res?['stores'] is List ? res['stores'] : []);
    } catch (_) {
      // Keep existing stores if network fails
    } finally {
      _loadingStores = false;
      notifyListeners();
    }
  }

  Future<void> loadCategories() async {
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/customer/categories');
      _categories = res is List ? res : [];
      notifyListeners();
    } catch (_) {
      // silently fail — static categories shown as fallback
    }
  }

  // ── Home CMS ─────────────────────────────────────────────────────────────────
  List<dynamic> _homeBanners       = [];
  List<dynamic> _homePromotions    = [];
  List<dynamic> _homeSections      = [];
  List<dynamic> _homeCmsCategories = [];
  List<dynamic> _featuredStores    = [];
  bool          _cmsLoading        = false;

  List<dynamic> get homeBanners       => _homeBanners;
  List<dynamic> get homePromotions    => _homePromotions;
  List<dynamic> get homeSections      => _homeSections;
  List<dynamic> get homeCmsCategories => _homeCmsCategories;
  List<dynamic> get featuredStores    => _featuredStores;
  bool          get cmsLoading        => _cmsLoading;

  /// Whether the CMS has categories configured (to decide fallback vs CMS rendering)
  bool get hasCmsCategories => _homeCmsCategories.isNotEmpty;
  /// Whether the CMS has featured stores configured
  bool get hasFeaturedStores => _featuredStores.isNotEmpty;

  Future<void> loadHomeCms() async {
    _cmsLoading = true;
    notifyListeners();
    try {
      final api = ApiService(token: _token);
      final res = await api.get('/home-cms/public');
      if (res is Map) {
        _homeBanners       = res['banners']        is List ? List.from(res['banners'])        : [];
        _homePromotions    = res['promotions']     is List ? List.from(res['promotions'])     : [];
        _homeSections      = res['sections']       is List ? List.from(res['sections'])       : [];
        _homeCmsCategories = res['categories']     is List ? List.from(res['categories'])     : [];
        _featuredStores    = res['featuredStores'] is List ? List.from(res['featuredStores']) : [];
      }
    } catch (_) {
      // silently fail — CMS content remains empty, app shows skeleton
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
        loaded.map((i) => i is Map<String, dynamic>
            ? i
            : Map<String, dynamic>.from(i as Map)),
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
      final cur = Map<String, dynamic>.from(_cart[idx] as Map);
      _cart[idx] = <String, dynamic>{...cur, 'qty': ((cur['qty'] as int?) ?? 1) + qty};
    } else {
      _cart.add(<String, dynamic>{...product, 'qty': qty});
    }
    _saveCart();
    notifyListeners();
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
      final cur = Map<String, dynamic>.from(_cart[idx] as Map);
      _cart[idx] = <String, dynamic>{...cur, 'qty': qty};
      _saveCart();
      notifyListeners();
    }
  }

  double get cartTotal => _cart.fold(
    0.0,
    (s, i) => s + (double.tryParse(i['price']?.toString() ?? '0') ?? 0) * ((i['qty'] as int?) ?? 1),
  );

  // ── Checkout ──────────────────────────────────────────────────────────────────
  bool _checkingOut = false;
  bool get checkingOut => _checkingOut;

  Future<bool> checkout({
    required String name,
    required String phone,
    required String address,
    required String governorate,
    String? notes,
    String? lat,
    String? lng,
  }) async {
    if (!isLoggedIn || _cart.isEmpty) return false;
    _checkingOut = true;
    notifyListeners();
    final api = ApiService(token: _token);
    // Extract merchantId from first cart item (all items must belong to same merchant)
    final merchantId = _cart.first['merchantId'] as String?;
    if (merchantId == null) {
      _checkingOut = false;
      notifyListeners();
      return false;
    }
    final items = _cart.map((i) => {
      'productId': i['id'],
      'quantity':  (i['qty'] as int?) ?? 1,
    }).toList();
    // Combine address + governorate into deliveryAddress
    final deliveryAddress = governorate.isNotEmpty
        ? '$address، $governorate'
        : address;
    try {
      final res = await api.post('/customer/orders', {
        'merchantId':      merchantId,
        'customerName':    name,
        'customerPhone':   ApiService.normalisePhone(phone),
        'deliveryAddress': deliveryAddress,
        'items':           items,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      }, auth: true);
      _checkingOut = false;
      if (res is Map && res['id'] != null) {
        _cart = [];
        await _saveCart();
        await loadOrders();
        notifyListeners();
        return true;
      }
      notifyListeners();
      return false;
    } catch (_) {
      _checkingOut = false;
      notifyListeners();
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
