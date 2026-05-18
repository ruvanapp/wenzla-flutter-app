import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://wenzla-backend-production.up.railway.app');

// ── Wenzla Brand Palette ────────────────────────────────────────────
const kBrown   = Color(0xFF472715); // Deep Dark Brown (primary dark)
const kOlive   = Color(0xFFB19F67); // Olive / Warm Tan
const kGold    = Color(0xFFECB836); // Golden Yellow  (primary brand)
const kOrange  = Color(0xFFCE7C29); // Amber Orange
const kCream   = Color(0xFFF5E9BF); // Cream / Ivory
const kPaper   = Color(0xFFFBF4E8); // Light warm background
const kDark    = Color(0xFF4B2F1A); // Darker slide-bg brown
const kField   = Color(0xFF5C3A1E); // Dark-card input fill
// ────────────────────────────────────────────────────────────────────

final FlutterLocalNotificationsPlugin _merchantLocalNotifications =
    FlutterLocalNotificationsPlugin();
final FirebaseAnalytics _merchantAnalytics = FirebaseAnalytics.instance;

const AndroidNotificationChannel _merchantOrderChannel =
    AndroidNotificationChannel(
  'wenzla_merchant_notifications',
  'تنبيهات التاجر',
  description: 'إشعارات الطلبات والتنبيهات العامة للتاجر',
  importance: Importance.high,
);

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await _merchantAnalytics.setAnalyticsCollectionEnabled(true);
  FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  await FirebaseMessaging.instance.requestPermission();
  await _merchantLocalNotifications.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );
  await _merchantLocalNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_merchantOrderChannel);
  runZonedGuarded(
    () => runApp(const MerchantApp()),
    (error, stack) => FirebaseCrashlytics.instance.recordError(error, stack, fatal: true),
  );
}

class MerchantApp extends StatelessWidget {
  const MerchantApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: const Locale('ar'),
      builder: (context, child) => Directionality(textDirection: TextDirection.rtl, child: child!),
      title: 'سوق العسل للتجار',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: kGold,
          primary: kGold,
          onPrimary: kBrown,
          secondary: kOrange,
          onSecondary: Colors.white,
          surface: Colors.white,
          onSurface: kBrown,
        ),
        scaffoldBackgroundColor: kPaper,
        useMaterial3: true,
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: kGold,
            foregroundColor: kBrown,
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: kBrown,
            side: const BorderSide(color: kOlive),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: kBrown,
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white.withValues(alpha: 0.88),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
          margin: const EdgeInsets.only(bottom: 14),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.82),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: kGold, width: 2),
          ),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white.withValues(alpha: 0.90),
          indicatorColor: kGold.withValues(alpha: 0.22),
          labelTextStyle: WidgetStateProperty.all(
            const TextStyle(fontWeight: FontWeight.w700, color: kBrown),
          ),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) return const IconThemeData(color: kBrown);
            return IconThemeData(color: kBrown.withValues(alpha: 0.45));
          }),
        ),
      ),
      home: const MerchantHome(),
    );
  }
}

class MerchantHome extends StatefulWidget {
  const MerchantHome({super.key});

  @override
  State<MerchantHome> createState() => _MerchantHomeState();
}

class _MerchantHomeState extends State<MerchantHome> {
  String? token;
  String? merchantId;
  int tabIndex = 0;
  dynamic profile;
  dynamic editingProduct;
  String? savedProductName;
  List<dynamic> orders = [];
  List<dynamic> products = [];
  List<dynamic> productVariants = [];
  Map<String, dynamic>? summary;
  final phoneController = TextEditingController();
  final passwordController = TextEditingController();
  final storeNameController = TextEditingController();
  final descriptionController = TextEditingController();
  final addressController = TextEditingController();
  final productNameController = TextEditingController();
  final productDescriptionController = TextEditingController();
  final weightController = TextEditingController();
  final priceController = TextEditingController();
  final stockController = TextEditingController(text: '10');
  final imageController = TextEditingController();
  final variantNameController = TextEditingController();
  final variantPriceController = TextEditingController();
  final variantStockController = TextEditingController(text: '10');
  final imagePicker = ImagePicker();
  final storePhoneController = TextEditingController();
  final businessHoursController = TextEditingController();
  String? _pickedLogoPath;
  String? _pickedBannerPath;
  bool _profileUploading = false;
  io.Socket? socket;
  dynamic selectedProductForVariants;
  StreamSubscription<RemoteMessage>? _foregroundNotificationSub;
  StreamSubscription<RemoteMessage>? _openedNotificationSub;
  StreamSubscription<String>? _tokenRefreshSub;

  Map<String, String> get headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  String normalizedPhone() {
    final raw = phoneController.text.trim();
    if (raw.isEmpty) return raw;

    final hasLeadingPlus = raw.startsWith('+');
    final digitsOnly = raw.replaceAll(RegExp(r'[^\d]'), '');
    if (digitsOnly.isEmpty) return raw;

    if (hasLeadingPlus && digitsOnly.startsWith('20')) {
      return '+$digitsOnly';
    }

    if (digitsOnly.startsWith('01') && digitsOnly.length == 11) {
      return '+2$digitsOnly';
    }

    if (digitsOnly.startsWith('1') && digitsOnly.length == 10) {
      return '+20$digitsOnly';
    }

    if (digitsOnly.startsWith('20') && !hasLeadingPlus) {
      return '+$digitsOnly';
    }

    if (hasLeadingPlus) {
      return '+$digitsOnly';
    }

    return '+$digitsOnly';
  }

  @override
  void initState() {
    super.initState();
    phoneController.clear();
    passwordController.clear();
    storeNameController.clear();
    setupNotificationListeners();
  }

  void setupNotificationListeners() {
    _foregroundNotificationSub = FirebaseMessaging.onMessage.listen((message) async {
      final notification = message.notification;
      if (notification != null) {
        await _merchantLocalNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              _merchantOrderChannel.id,
              _merchantOrderChannel.name,
              channelDescription: _merchantOrderChannel.description,
              icon: '@mipmap/ic_launcher',
            ),
          ),
        );
      }
      await acknowledgeNotificationDisplay(message, 'FOREGROUND');
    });

    _openedNotificationSub =
        FirebaseMessaging.onMessageOpenedApp.listen((message) async {
      await acknowledgeNotificationDisplay(message, 'BACKGROUND_OPEN');
    });

    FirebaseMessaging.instance.getInitialMessage().then((message) async {
      if (message != null) {
        await acknowledgeNotificationDisplay(message, 'TERMINATED_OPEN');
      }
    });

    _tokenRefreshSub =
        FirebaseMessaging.instance.onTokenRefresh.listen((refreshedToken) async {
      await registerFcmToken(refreshedToken);
    });
  }

  Future<void> registerFcmToken([String? overrideToken]) async {
    if (token == null) return;
    try {
      final fcmToken = overrideToken ?? await FirebaseMessaging.instance.getToken();
      if (fcmToken == null || fcmToken.isEmpty) return;
      final response = await http.patch(
        Uri.parse('$apiUrl/auth/merchant/fcm-token'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
          'platform': 'android',
        }),
      ).timeout(const Duration(seconds: 15));
      if (response.statusCode >= 400) return;
    } catch (_) {}
  }

  Future<void> acknowledgeNotificationDisplay(
    RemoteMessage message,
    String displayMode,
  ) async {
    if (token == null) return;
    final notificationId = message.data['notificationId'];
    if (notificationId == null || notificationId.toString().isEmpty) return;
    final fcmToken = await FirebaseMessaging.instance.getToken();
    if (fcmToken == null || fcmToken.isEmpty) return;
    try {
      await http.post(
        Uri.parse('$apiUrl/auth/notifications/display-ack'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'notificationId': notificationId,
          'fcmToken': fcmToken,
          'displayMode': displayMode,
          'firebaseMessageId': message.messageId,
        }),
      );
    } catch (_) {}
  }

  Future<dynamic> request(String method, String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('$apiUrl$path');
    final encoded = body == null ? null : jsonEncode(body);
    final response = await (switch (method) {
      'POST' => http.post(uri, headers: headers, body: encoded),
      'PATCH' => http.patch(uri, headers: headers, body: encoded),
      'DELETE' => http.delete(uri, headers: headers),
      _ => http.get(uri, headers: headers),
    }).timeout(const Duration(seconds: 20));
    if (response.statusCode >= 400) {
      try {
        final decoded = jsonDecode(response.body);
        throw Exception(decoded['message'] ?? 'HTTP ${response.statusCode}');
      } catch (_) {
        throw Exception('HTTP ${response.statusCode}');
      }
    }
    if (response.body.isEmpty) return null;
    return jsonDecode(utf8.decode(response.bodyBytes));
  }

  Future<void> register() async {
    try {
      final data = await request('POST', '/auth/merchant/register', body: {
        'phone': normalizedPhone(),
        'password': passwordController.text,
        'storeName': storeNameController.text,
      });
      applyAuth(data);
      await refreshAll();
      await _merchantAnalytics.logSignUp(signUpMethod: 'merchant_phone');
      showMessage('تم تسجيل التاجر. بانتظار موافقة الإدارة.');
    } catch (error) {
      showMessage('فشل التسجيل: $error');
    }
  }

  Future<void> login() async {
    try {
      final data = await request('POST', '/auth/merchant/login', body: {
        'phone': normalizedPhone(),
        'password': passwordController.text,
      });
      applyAuth(data);
      await refreshAll();
      await _merchantAnalytics.logLogin(loginMethod: 'merchant_phone');
      showMessage('تم تسجيل الدخول');
    } catch (error) {
      showMessage('فشل تسجيل الدخول: $error');
    }
  }

  void applyAuth(dynamic data) {
    if (!mounted) return;
    setState(() {
      token = data['token'];
      merchantId = data['user']['merchant']['id'];
      profile = data['user']['merchant'];
    });
    registerFcmToken();
    connectRealtime();
    // Start status polling immediately so PENDING merchants see approval fast.
    _updateStatusPolling();
  }

  void connectRealtime() {
    socket?.dispose();
    if (token == null) return;
    socket = io.io(
      apiUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .build(),
    );
    socket?.onConnect((_) => socket?.emit('merchant:join', merchantId));
    socket?.on('order:new', (order) {
      if (!mounted) return;
      setState(() => orders.insert(0, order));
      showMessage('تم استلام طلب جديد');
    });
    // Listen for admin approval/block events and refresh status immediately.
    socket?.on('merchant:status_changed', (data) {
      if (!mounted) return;
      final newStatus = data['status'] as String?;
      if (newStatus == null) return;
      setState(() {
        if (profile != null) {
          profile = {...profile as Map, 'status': newStatus,
            if (data['blockedReason'] != null) 'blockedReason': data['blockedReason']};
        }
      });
      final msgs = {
        'APPROVED': 'تمت الموافقة على متجرك! يمكنك الآن البدء في البيع.',
        'REJECTED': 'نأسف، تم رفض طلب تسجيل متجرك.',
        'BLOCKED':  'تم إيقاف تشغيل متجرك. يرجى التواصل مع الدعم.',
        'PENDING':  'حالة متجرك: بانتظار المراجعة.',
      };
      showMessage(msgs[newStatus] ?? 'تم تحديث حالة المتجر: $newStatus');
      // If newly approved, do a full refresh to load products/orders.
      if (newStatus == 'APPROVED') refreshAll();
    });
  }

  Future<void> refreshAll() async {
    try {
      await Future.wait([loadProfile(), loadProducts(), loadOrders(), loadSummary()]);
    } catch (error) {
      showMessage('تعذر تحديث البيانات');
    }
    // After every refresh, re-evaluate status polling.
    _updateStatusPolling();
  }

  // -----------------------------------------------------------------------
  // loadStatus — calls /merchant/status which works for ALL merchants,
  // including PENDING/BLOCKED (unlike /merchant/profile which returns 403).
  // -----------------------------------------------------------------------
  Future<void> loadStatus() async {
    try {
      final data = await request('GET', '/merchant/status');
      if (!mounted) return;
      final newStatus = data['status'] as String?;
      if (newStatus == null) return;
      final currentStatus = profile?['status'] as String?;
      if (newStatus == currentStatus) return; // No change — skip setState.
      setState(() {
        profile = profile != null
            ? {...profile as Map, 'status': newStatus,
                'blockedReason': data['blockedReason']}
            : data;
      });
      if (newStatus == 'APPROVED' && currentStatus != 'APPROVED') {
        showMessage('تمت الموافقة على متجرك! يمكنك الآن البدء في البيع.');
        await refreshAll(); // Load products/orders now that we're approved.
      } else if (newStatus == 'BLOCKED' && currentStatus != 'BLOCKED') {
        showMessage('تم إيقاف تشغيل متجرك. يرجى التواصل مع الدعم.');
      }
      _updateStatusPolling();
    } catch (_) {
      // Silent — polling should not disrupt UI.
    }
  }

  // Poll /merchant/status every 15 seconds while PENDING or REJECTED.
  // Stops automatically once APPROVED or BLOCKED.
  Timer? _statusTimer;

  void _updateStatusPolling() {
    final status = profile?['status'] as String? ?? 'PENDING';
    if (status == 'PENDING' || status == 'REJECTED') {
      _statusTimer ??= Timer.periodic(const Duration(seconds: 15), (_) => loadStatus());
    } else {
      _statusTimer?.cancel();
      _statusTimer = null;
    }
  }

  Future<void> loadProfile() async {
    final data = await request('GET', '/merchant/profile');
    if (!mounted) return;
    setState(() {
      profile = data;
      storeNameController.text     = data['storeName']     ?? storeNameController.text;
      descriptionController.text   = data['description']   ?? descriptionController.text;
      addressController.text       = data['address']       ?? addressController.text;
      storePhoneController.text    = data['phone']         ?? storePhoneController.text;
      businessHoursController.text = data['businessHours'] ?? businessHoursController.text;
    });
  }

  Future<void> saveProfile() async {
    try {
      setState(() => _profileUploading = true);
      final body = <String, dynamic>{
        'storeName':     storeNameController.text.trim(),
        'description':   descriptionController.text.trim(),
        'address':       addressController.text.trim(),
        'phone':         storePhoneController.text.trim().isEmpty ? null : storePhoneController.text.trim(),
        'businessHours': businessHoursController.text.trim().isEmpty ? null : businessHoursController.text.trim(),
      };
      final data = await request('PATCH', '/merchant/profile', body: body);
      if (!mounted) return;
      setState(() { profile = data; _profileUploading = false; });
      showMessage('تم حفظ ملف المتجر بنجاح');
    } catch (error) {
      if (mounted) setState(() => _profileUploading = false);
      showMessage('تعذر حفظ ملف المتجر');
    }
  }

  Future<String?> _uploadStoreImage(String localPath, String endpoint) async {
    final req = http.MultipartRequest('POST', Uri.parse('$apiUrl/$endpoint'));
    req.headers['Authorization'] = 'Bearer $token';
    req.files.add(await http.MultipartFile.fromPath('image', localPath,
        contentType: MediaType('image', 'jpeg')));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 201) {
      final body = jsonDecode(res.body);
      return body['imageUrl'] as String?;
    }
    return null;
  }

  Future<void> pickStoreLogo() async {
    final picked = await imagePicker.pickImage(
        source: ImageSource.gallery, imageQuality: 82, maxWidth: 600, maxHeight: 600);
    if (picked == null) return;
    setState(() { _pickedLogoPath = picked.path; _profileUploading = true; });
    try {
      final url = await _uploadStoreImage(picked.path, 'uploads/store-logo');
      if (!mounted) return;
      if (url != null) {
        final data = await request('PATCH', '/merchant/profile', body: {'logoUrl': url});
        setState(() { profile = data; });
        showMessage('تم رفع شعار المتجر');
      } else {
        showMessage('تعذر رفع الشعار');
      }
    } finally {
      if (mounted) setState(() => _profileUploading = false);
    }
  }

  Future<void> pickStoreBanner() async {
    final picked = await imagePicker.pickImage(
        source: ImageSource.gallery, imageQuality: 75, maxWidth: 1200, maxHeight: 480);
    if (picked == null) return;
    setState(() { _pickedBannerPath = picked.path; _profileUploading = true; });
    try {
      final url = await _uploadStoreImage(picked.path, 'uploads/store-banner');
      if (!mounted) return;
      if (url != null) {
        final data = await request('PATCH', '/merchant/profile', body: {'bannerUrl': url});
        setState(() { profile = data; });
        showMessage('تم رفع صورة الغلاف');
      } else {
        showMessage('تعذر رفع صورة الغلاف');
      }
    } finally {
      if (mounted) setState(() => _profileUploading = false);
    }
  }

  Future<void> loadProducts() async {
    final data = await request('GET', '/merchant/products');
    if (!mounted) return;
    setState(() => products = data);
  }

  Future<void> loadOrders() async {
    final data = await request('GET', '/merchant/orders');
    if (!mounted) return;
    setState(() => orders = data);
  }

  Future<void> loadSummary() async {
    final data = await request('GET', '/merchant/sales/summary');
    if (!mounted) return;
    setState(() => summary = data);
  }

  Future<void> saveProduct() async {
    if (productNameController.text.trim().length < 2) {
      showMessage('أدخل اسم المنتج');
      return;
    }
    if (productDescriptionController.text.trim().length < 2) {
      showMessage('أدخل وصف المنتج');
      return;
    }
    if (weightController.text.trim().isEmpty) {
      showMessage('أدخل وزن المنتج');
      return;
    }
    final parsedPrice = double.tryParse(priceController.text);
    if (parsedPrice == null || parsedPrice <= 0) {
      showMessage('أدخل سعر صحيح');
      return;
    }
    final parsedStock = int.tryParse(stockController.text);
    if (parsedStock == null || parsedStock < 0) {
      showMessage('أدخل مخزون صحيح');
      return;
    }
    if (imageController.text.trim().isEmpty) {
      showMessage('ارفع صورة المنتج أولاً');
      return;
    }
    try {
      final body = {
        'name': productNameController.text.trim(),
        'description': productDescriptionController.text.trim(),
        'weight': weightController.text.trim(),
        'price': parsedPrice,
        'stock': parsedStock,
        'imageUrl': imageController.text.trim(),
      };
      if (editingProduct == null) {
        await request('POST', '/merchant/products', body: body);
        if (!mounted) return;
        setState(() => savedProductName = productNameController.text.trim());
        showMessage('تمت إضافة المنتج');
      } else {
        await request('PATCH', '/merchant/products/${editingProduct['id']}', body: body);
        if (!mounted) return;
        setState(() => savedProductName = productNameController.text.trim());
        showMessage('تم تحديث المنتج');
      }
      clearProductForm();
      await loadProducts();
    } catch (error) {
      showMessage('فشل حفظ المنتج');
    }
  }

  Future<void> pickAndUploadImage() async {
    try {
      final image = await imagePicker.pickImage(source: ImageSource.gallery, imageQuality: 78);
      if (image == null || token == null) return;

      final req = http.MultipartRequest('POST', Uri.parse('$apiUrl/uploads/product-image'));
      req.headers['Authorization'] = 'Bearer $token';
      req.files.add(await http.MultipartFile.fromPath(
        'image',
        image.path,
        contentType: MediaType('image', image.path.split('.').last.toLowerCase()),
      ));

      final response = await req.send();
      final body = await response.stream.bytesToString();
      if (response.statusCode >= 400) throw Exception(body);

      final data = jsonDecode(body);
      if (!mounted) return;
      setState(() => imageController.text = data['imageUrl']);
      showMessage('تم رفع الصورة');
    } catch (error) {
      showMessage('فشل رفع الصورة');
    }
  }

  Future<void> loadProductVariants(String productId) async {
    try {
      final data = await request('GET', '/merchant/products/$productId/variants');
      if (!mounted) return;
      setState(() => productVariants = data ?? []);
    } catch (_) {
      productVariants = [];
    }
  }

  Future<void> saveVariant(String productId) async {
    final name = variantNameController.text.trim();
    final price = double.tryParse(variantPriceController.text);
    final stock = int.tryParse(variantStockController.text);
    if (name.isEmpty || price == null || price <= 0) {
      showMessage('أدخل اسم وسعر صحيح للاختيار');
      return;
    }
    try {
      await request('POST', '/merchant/products/$productId/variants', body: {
        'name': name,
        'price': price,
        'stock': stock ?? 0,
      });
      variantNameController.clear();
      variantPriceController.clear();
      variantStockController.text = '10';
      await loadProductVariants(productId);
      showMessage('تمت إضافة الاختيار');
    } catch (_) {
      showMessage('فشل إضافة الاختيار');
    }
  }

  Future<void> deleteVariant(String productId, String variantId) async {
    try {
      await request('DELETE', '/merchant/products/$productId/variants/$variantId');
      await loadProductVariants(productId);
      showMessage('تم حذف الاختيار');
    } catch (_) {
      showMessage('فشل الحذف');
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      await request('DELETE', '/merchant/products/$id');
      await loadProducts();
      showMessage('تم حذف المنتج');
    } catch (error) {
      showMessage('فشل الحذف');
    }
  }

  Future<void> updateOrder(String orderId, String status) async {
    try {
      await request('PATCH', '/merchant/orders/$orderId/status', body: {'status': status});
      await Future.wait([loadOrders(), loadSummary()]);
      showMessage('تم تحديث الحالة إلى $status');
    } catch (error) {
      showMessage('فشل تحديث الحالة: $error');
    }
  }

  void logout() {
    if (!mounted) return;
    socket?.dispose();
    setState(() {
      token = null;
      merchantId = null;
      profile = null;
      orders = [];
      products = [];
      productVariants = [];
      summary = null;
      editingProduct = null;
      savedProductName = null;
      tabIndex = 0;
    });
    phoneController.clear();
    passwordController.clear();
    storeNameController.clear();
    descriptionController.clear();
    addressController.clear();
    productNameController.clear();
    productDescriptionController.clear();
    weightController.clear();
    priceController.clear();
    stockController.text = '10';
    imageController.clear();
    variantNameController.clear();
    variantPriceController.clear();
    variantStockController.text = '10';
    _merchantAnalytics.logEvent(name: 'merchant_logout');
    showMessage('تم تسجيل الخروج');
  }

  void editProduct(dynamic product) {
    setState(() {
      editingProduct = product;
      savedProductName = null;
      productNameController.text = product['name'] ?? '';
      productDescriptionController.text = product['description'] ?? '';
      weightController.text = product['weight'] ?? '';
      priceController.text = '${product['price']}';
      stockController.text = '${product['stock']}';
      imageController.text = product['imageUrl'] ?? '';
      tabIndex = 1;
    });
  }

  void clearProductForm() {
    setState(() {
      editingProduct = null;
      productNameController.clear();
      productDescriptionController.clear();
      weightController.clear();
      priceController.clear();
      stockController.text = '10';
      imageController.clear();
    });
  }

  void showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: kBrown,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ));
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    socket?.dispose();
    _foregroundNotificationSub?.cancel();
    _openedNotificationSub?.cancel();
    _tokenRefreshSub?.cancel();
    phoneController.dispose();
    passwordController.dispose();
    storeNameController.dispose();
    descriptionController.dispose();
    addressController.dispose();
    productNameController.dispose();
    productDescriptionController.dispose();
    weightController.dispose();
    priceController.dispose();
    stockController.dispose();
    imageController.dispose();
    variantNameController.dispose();
    variantPriceController.dispose();
    variantStockController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (token == null) {
      return authView();
    }

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [kPaper, kCream],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(profile?['storeName'] ?? 'استوديو التاجر', style: const TextStyle(fontWeight: FontWeight.w900, color: kBrown)),
          actions: [IconButton(onPressed: refreshAll, icon: const Icon(Icons.refresh_rounded, color: kBrown))],
        ),
        body: IndexedStack(
          index: tabIndex,
          children: [dashboardView(), productsView(), ordersView(), profileView()],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tabIndex,
          onDestinationSelected: (index) => setState(() => tabIndex = index),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.dashboard_rounded), label: 'المبيعات'),
            NavigationDestination(icon: Icon(Icons.inventory_2_rounded), label: 'المنتجات'),
            NavigationDestination(icon: Icon(Icons.receipt_long_rounded), label: 'الطلبات'),
            NavigationDestination(icon: Icon(Icons.store_rounded), label: 'المتجر'),
          ],
        ),
      ),
    );
  }

  Widget authView() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [kBrown, kDark],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(22),
            children: [
              const SizedBox(height: 40),
              const Text('استوديو التاجر', style: TextStyle(color: kGold, fontWeight: FontWeight.w900, letterSpacing: 1.8)),
              const SizedBox(height: 12),
              const Text('أدر متجرك من أي مكان.', style: TextStyle(color: Colors.white, fontSize: 42, height: 0.95, fontWeight: FontWeight.w900)),
              const SizedBox(height: 18),
              const Text('أضف المنتجات واستقبل الطلبات مباشرة وتابع العمولة المستحقة.', style: TextStyle(color: kCream)),
              const SizedBox(height: 30),
              TextField(controller: phoneController, style: const TextStyle(color: Colors.white), decoration: authDecoration('رقم الهاتف')),
              const SizedBox(height: 12),
              TextField(controller: passwordController, obscureText: true, style: const TextStyle(color: Colors.white), decoration: authDecoration('كلمة المرور')),
              const SizedBox(height: 12),
              TextField(controller: storeNameController, style: const TextStyle(color: Colors.white), decoration: authDecoration('اسم المتجر للتسجيل')),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: login,
                style: FilledButton.styleFrom(backgroundColor: kGold, foregroundColor: kBrown, padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('تسجيل الدخول', style: TextStyle(fontWeight: FontWeight.w900)),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: register,
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: kOlive), padding: const EdgeInsets.symmetric(vertical: 14)),
                child: const Text('تسجيل تاجر'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration authDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: kCream),
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.1),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
    );
  }

  Widget dashboardView() {
    final status = profile?['status'] ?? 'PENDING';
    final approved = status == 'APPROVED';
    final pendingOrders = orders.where((order) => order['status'] == 'PENDING').length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(32),
            gradient: LinearGradient(
              colors: approved
                  ? const [kBrown, kOrange]
                  : const [kOrange, kGold],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            boxShadow: [BoxShadow(color: kBrown.withValues(alpha: 0.3), blurRadius: 28, offset: const Offset(0, 16))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('حالة المتجر: $status', style: const TextStyle(color: kCream, fontWeight: FontWeight.w900, letterSpacing: 1.2)),
              const SizedBox(height: 10),
              Text(approved ? 'متجرك مفعل الآن.' : 'بانتظار موافقة الإدارة.', style: const TextStyle(color: Colors.white, fontSize: 32, height: 0.95, fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              const Text('ستظهر طلبات العملاء الجديدة هنا مباشرة.', style: TextStyle(color: kCream)),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Row(children: [
          Expanded(child: metricCard('المبيعات', '${summary?['totalSales'] ?? 0} ج.م', Icons.payments_rounded)),
          Expanded(child: metricCard('العمولة', '${summary?['commissionOwed'] ?? 0} ج.م', Icons.percent_rounded)),
        ]),
        Row(children: [
          Expanded(child: metricCard('نسبة العمولة', '${summary?['commissionPercentage'] ?? 0}%', Icons.percent_rounded)),
          Expanded(child: metricCard('الطلبات المكتملة', '${summary?['deliveredOrders'] ?? 0}', Icons.check_circle_rounded)),
        ]),
        Row(children: [
          Expanded(child: metricCard('قيد الانتظار', '$pendingOrders', Icons.notifications_active_rounded)),
          Expanded(child: metricCard('المنتجات', '${products.length}', Icons.inventory_2_rounded)),
        ]),
      ],
    );
  }

  Widget productsView() {
    if (savedProductName != null) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          sectionTitle('تم حفظ المنتج', savedProductName!),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_rounded, color: kGold, size: 54),
                  const SizedBox(height: 14),
                  Text('تم رفع ${savedProductName!} بنجاح', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: kBrown)),
                  const SizedBox(height: 8),
                  const Text('يمكنك الآن إضافة منتج جديد بنفس السهولة.', style: TextStyle(color: kDark)),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        clearProductForm();
                        setState(() => savedProductName = null);
                      },
                      child: const Text('إضافة منتج آخر'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          sectionTitle('المنتجات الحالية', '${products.length} منتج'),
          ...products.map(productCard),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
      children: [
        sectionTitle(editingProduct == null ? 'إضافة منتج' : 'تعديل منتج', '${products.length} منتج'),
        TextField(controller: productNameController, decoration: const InputDecoration(labelText: 'اسم المنتج')),
        const SizedBox(height: 12),
        TextField(controller: productDescriptionController, decoration: const InputDecoration(labelText: 'الوصف')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: weightController, decoration: const InputDecoration(labelText: 'الوزن'))),
          const SizedBox(width: 12),
          Expanded(child: TextField(controller: priceController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'السعر'))),
          const SizedBox(width: 12),
          Expanded(child: TextField(controller: stockController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المخزون'))),
        ]),
        const SizedBox(height: 12),
        TextField(controller: imageController, decoration: const InputDecoration(labelText: 'رابط الصورة')),
        const SizedBox(height: 12),
        OutlinedButton.icon(onPressed: pickAndUploadImage, icon: const Icon(Icons.photo_library_rounded), label: const Text('اختيار ورفع صورة المنتج')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: FilledButton(onPressed: saveProduct, child: Text(editingProduct == null ? 'إضافة منتج' : 'حفظ التغييرات'))),
          if (editingProduct != null) ...[
            const SizedBox(width: 10),
            OutlinedButton(onPressed: clearProductForm, child: const Text('إلغاء')),
          ],
        ]),
        const SizedBox(height: 24),
        sectionTitle('المخزون', 'اضغط تعديل للتحديث'),
        if (products.isEmpty) mutedCard('لا توجد منتجات بعد. أضف أول منتج بالأعلى.'),
        ...products.map(productCard),
      ],
    );
  }

  Widget productCard(dynamic product) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            productImage(product['imageUrl']),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(product['name'], style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: kBrown)),
                const SizedBox(height: 4),
                Text('${product['weight'] ?? 'بدون وزن'} · ${product['price']} ج.م · المخزون ${product['stock']} · ${product['status']}',
                    style: const TextStyle(color: kDark)),
              ]),
            ),
            IconButton(onPressed: () => editProduct(product), icon: const Icon(Icons.edit_rounded, color: kOlive)),
            IconButton(onPressed: () => deleteProduct(product['id']), icon: const Icon(Icons.delete_rounded, color: kOrange)),
            IconButton(onPressed: () => manageVariants(product), icon: const Icon(Icons.layers_outlined, color: kGold)),
          ],
        ),
      ),
    );
  }

  Widget ordersView() {
    return RefreshIndicator(
      color: kGold,
      onRefresh: loadOrders,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          sectionTitle('الطلبات المباشرة', '${orders.length} طلب'),
          if (orders.isEmpty) mutedCard('لا توجد طلبات بعد. حافظ على تحديث واعتماد منتجاتك.'),
          ...orders.map(orderCard),
        ],
      ),
    );
  }

  Widget productImage(String? imageUrl) {
    final resolvedUrl = imageUrl != null && imageUrl.startsWith('/') ? '$apiUrl$imageUrl' : imageUrl;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: resolvedUrl == null || resolvedUrl.isEmpty
          ? Container(width: 58, height: 58, color: kCream, child: const Icon(Icons.inventory_2_rounded, color: kOlive))
          : Image.network(resolvedUrl, width: 58, height: 58, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(width: 58, height: 58, color: kCream, child: const Icon(Icons.image_not_supported_rounded, color: kOlive))),
    );
  }

  Widget orderCard(dynamic order) {
    return Card(
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(order['customerName'], style: const TextStyle(fontWeight: FontWeight.w900, color: kBrown)),
        subtitle: Text('${order['customerPhone']} · ${order['deliveryAddress']}', style: const TextStyle(color: kDark)),
        trailing: Text('${order['total']} ج.م', style: const TextStyle(fontWeight: FontWeight.w900, color: kOrange)),
        children: [
          ...List<dynamic>.from(order['items']).map((item) => ListTile(
                title: Text(item['product']['name'], style: const TextStyle(color: kBrown)),
                subtitle: Text('الكمية ${item['quantity']} · ${item['total']} ج.م', style: const TextStyle(color: kDark)),
              )),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: DropdownButtonFormField<String>(
              value: order['status'],
              decoration: const InputDecoration(labelText: 'تحديث حالة الطلب'),
              items: const ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
                  .map((status) => DropdownMenuItem(value: status, child: Text(status)))
                  .toList(),
              onChanged: (status) {
                if (status != null) updateOrder(order['id'], status);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget profileView() {
    final logoUrl   = profile?['logoUrl']   as String?;
    final bannerUrl = profile?['bannerUrl'] as String?;
    final status    = profile?['status']    as String? ?? 'PENDING';

    Widget statusBadge() {
      final isApproved = status == 'APPROVED';
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isApproved
              ? const Color(0xFF2E7D32).withValues(alpha: 0.12)
              : kGold.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isApproved ? const Color(0xFF2E7D32) : kGold,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isApproved ? Icons.verified_rounded : Icons.schedule_rounded,
              size: 14,
              color: isApproved ? const Color(0xFF2E7D32) : kGold,
            ),
            const SizedBox(width: 5),
            Text(
              isApproved ? 'مفعّل' : 'قيد المراجعة',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isApproved ? const Color(0xFF2E7D32) : kGold,
              ),
            ),
          ],
        ),
      );
    }

    Widget buildField(String label, TextEditingController ctrl,
        {TextInputType keyboardType = TextInputType.text,
        int maxLines = 1,
        String? hint}) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextField(
          controller: ctrl,
          keyboardType: keyboardType,
          maxLines: maxLines,
          textDirection: TextDirection.rtl,
          decoration: InputDecoration(
            labelText: label,
            hintText: hint,
            alignLabelWithHint: maxLines > 1,
            filled: true,
            fillColor: kPaper,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: kBrown.withValues(alpha: 0.25)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: kBrown.withValues(alpha: 0.2)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: kGold, width: 1.5),
            ),
          ),
        ),
      );
    }

    Widget sectionHeader(String title, IconData icon) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(0, 8, 0, 14),
        child: Row(
          children: [
            Icon(icon, size: 18, color: kGold),
            const SizedBox(width: 8),
            Text(title,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: kBrown)),
          ],
        ),
      );
    }

    // ── Banner section ────────────────────────────────────────────────────────
    Widget bannerSection() {
      final hasLocalBanner = _pickedBannerPath != null;
      final hasBanner = bannerUrl != null && bannerUrl.isNotEmpty;
      return GestureDetector(
        onTap: _profileUploading ? null : pickStoreBanner,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              // Banner image
              Container(
                height: 180,
                width: double.infinity,
                color: kBrown.withValues(alpha: 0.08),
                child: hasLocalBanner
                    ? Image.file(File(_pickedBannerPath!),
                        fit: BoxFit.cover, width: double.infinity)
                    : hasBanner
                        ? Image.network(bannerUrl,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            errorBuilder: (_, __, ___) => _bannerPlaceholder())
                        : _bannerPlaceholder(),
              ),
              // Dark gradient overlay + change hint
              Container(
                height: 180,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.45),
                    ],
                  ),
                ),
              ),
              Positioned(
                bottom: 10,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.camera_alt_rounded,
                          size: 14, color: Colors.white),
                      SizedBox(width: 5),
                      Text('تغيير صورة الغلاف',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              // Upload progress overlay
              if (_profileUploading)
                Container(
                  height: 180,
                  color: Colors.black.withValues(alpha: 0.35),
                  child: const Center(
                      child: CircularProgressIndicator(color: Colors.white)),
                ),
            ],
          ),
        ),
      );
    }

    // ── Logo section ──────────────────────────────────────────────────────────
    Widget logoSection() {
      final hasLocalLogo = _pickedLogoPath != null;
      final hasLogo = logoUrl != null && logoUrl.isNotEmpty;
      return GestureDetector(
        onTap: _profileUploading ? null : pickStoreLogo,
        child: Stack(
          alignment: Alignment.bottomRight,
          children: [
            CircleAvatar(
              radius: 44,
              backgroundColor: kCream,
              backgroundImage: hasLocalLogo
                  ? FileImage(File(_pickedLogoPath!))
                  : hasLogo
                      ? NetworkImage(logoUrl) as ImageProvider
                      : null,
              child: (!hasLocalLogo && !hasLogo)
                  ? Icon(Icons.storefront_rounded,
                      size: 38, color: kBrown.withValues(alpha: 0.5))
                  : null,
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                    color: kGold,
                    shape: BoxShape.circle,
                    border:
                        Border.all(color: Colors.white, width: 1.5)),
                child: const Icon(Icons.edit_rounded,
                    size: 12, color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }

    // ── Preview card ──────────────────────────────────────────────────────────
    Widget previewCard() {
      final hasLocalBanner = _pickedBannerPath != null;
      final hasBanner = bannerUrl != null && bannerUrl.isNotEmpty;
      final hasLocalLogo = _pickedLogoPath != null;
      final hasLogo = logoUrl != null && logoUrl.isNotEmpty;
      final name = storeNameController.text.trim().isNotEmpty
          ? storeNameController.text.trim()
          : (profile?['storeName'] ?? 'اسم المتجر');
      final desc = descriptionController.text.trim().isNotEmpty
          ? descriptionController.text.trim()
          : 'وصف المتجر...';
      final phone = storePhoneController.text.trim();
      final hours = businessHoursController.text.trim();

      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: kBrown.withValues(alpha: 0.18)),
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: kBrown.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner preview
            SizedBox(
              height: 110,
              width: double.infinity,
              child: hasLocalBanner
                  ? Image.file(File(_pickedBannerPath!), fit: BoxFit.cover)
                  : hasBanner
                      ? Image.network(bannerUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _bannerPlaceholder())
                      : _bannerPlaceholder(),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo preview
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: kCream,
                    backgroundImage: hasLocalLogo
                        ? FileImage(File(_pickedLogoPath!))
                        : hasLogo
                            ? NetworkImage(logoUrl) as ImageProvider
                            : null,
                    child: (!hasLocalLogo && !hasLogo)
                        ? Icon(Icons.storefront_rounded,
                            size: 24, color: kBrown.withValues(alpha: 0.4))
                        : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                                color: kBrown)),
                        const SizedBox(height: 3),
                        Text(desc,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontSize: 12,
                                color: kDark.withValues(alpha: 0.7))),
                        if (phone.isNotEmpty || hours.isNotEmpty)
                          const SizedBox(height: 6),
                        if (phone.isNotEmpty)
                          Row(children: [
                            Icon(Icons.phone_rounded,
                                size: 12,
                                color: kGold.withValues(alpha: 0.8)),
                            const SizedBox(width: 4),
                            Text(phone,
                                style: const TextStyle(
                                    fontSize: 11, color: kDark)),
                          ]),
                        if (hours.isNotEmpty)
                          Row(children: [
                            Icon(Icons.access_time_rounded,
                                size: 12,
                                color: kGold.withValues(alpha: 0.8)),
                            const SizedBox(width: 4),
                            Text(hours,
                                style: const TextStyle(
                                    fontSize: 11, color: kDark)),
                          ]),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 32),
      children: [
        // ── Header row ────────────────────────────────────────────────────
        Row(
          children: [
            Expanded(
              child: Text('ملف المتجر',
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: kBrown)),
            ),
            statusBadge(),
          ],
        ),
        const SizedBox(height: 16),

        // ── Banner ────────────────────────────────────────────────────────
        bannerSection(),
        const SizedBox(height: 14),

        // ── Logo row ──────────────────────────────────────────────────────
        Row(
          children: [
            logoSection(),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile?['storeName'] ?? 'متجري',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: kBrown),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'اضغط على الشعار أو الغلاف لتغييرهما',
                    style: TextStyle(
                        fontSize: 12,
                        color: kDark.withValues(alpha: 0.55)),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // ── Store info ────────────────────────────────────────────────────
        sectionHeader('معلومات المتجر', Icons.store_rounded),
        buildField('اسم المتجر *', storeNameController),
        buildField('وصف المتجر', descriptionController,
            maxLines: 3,
            hint: 'اكتب نبذة عن متجرك ومنتجاتك...'),

        // ── Contact ───────────────────────────────────────────────────────
        sectionHeader('التواصل والموقع', Icons.location_on_rounded),
        buildField('رقم الهاتف',  storePhoneController,
            keyboardType: TextInputType.phone,
            hint: 'مثال: 01XXXXXXXXX'),
        buildField('عنوان المتجر', addressController,
            hint: 'المدينة، المنطقة'),

        // ── Business hours ────────────────────────────────────────────────
        sectionHeader('مواعيد العمل', Icons.access_time_rounded),
        buildField('مواعيد العمل', businessHoursController,
            hint: 'مثال: السبت–الجمعة 8 ص – 10 م'),
        const SizedBox(height: 6),

        // ── Preview ───────────────────────────────────────────────────────
        sectionHeader('معاينة المتجر', Icons.preview_rounded),
        previewCard(),
        const SizedBox(height: 24),

        // ── Save button ───────────────────────────────────────────────────
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton.icon(
            onPressed: _profileUploading ? null : saveProfile,
            icon: _profileUploading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_rounded, size: 18),
            label: const Text('حفظ التغييرات',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            style: FilledButton.styleFrom(
              backgroundColor: kBrown,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── Logout ────────────────────────────────────────────────────────
        SizedBox(
          width: double.infinity,
          height: 46,
          child: OutlinedButton.icon(
            onPressed: logout,
            icon: const Icon(Icons.logout_rounded, size: 18, color: kOrange),
            label: const Text('تسجيل الخروج',
                style: TextStyle(
                    color: kOrange, fontSize: 15, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: kOrange, width: 1.2),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _bannerPlaceholder() {
    return Container(
      color: kBrown.withValues(alpha: 0.06),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add_photo_alternate_rounded,
                size: 36, color: kBrown.withValues(alpha: 0.3)),
            const SizedBox(height: 6),
            Text('اضغط لإضافة صورة الغلاف',
                style: TextStyle(
                    fontSize: 12, color: kBrown.withValues(alpha: 0.45))),
          ],
        ),
      ),
    );
  }

  Widget metricCard(String label, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: kGold),
            const SizedBox(height: 12),
            Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900, color: kBrown)),
            Text(label, style: const TextStyle(color: kDark)),
          ],
        ),
      ),
    );
  }

  Widget sectionTitle(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(child: Text(title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: kBrown))),
          Text(subtitle, style: TextStyle(color: kBrown.withValues(alpha: 0.55))),
        ],
      ),
    );
  }

  Widget mutedCard(String text) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Text(text, style: TextStyle(color: kBrown.withValues(alpha: 0.58))),
      ),
    );
  }

  void manageVariants(dynamic product) {
    selectedProductForVariants = product;
    productVariants = [];
    loadProductVariants(product['id']);
    Navigator.push(context, MaterialPageRoute(builder: (_) => variantScreen()));
  }

  Widget variantScreen() {
    final product = selectedProductForVariants;
    return Scaffold(
      appBar: AppBar(title: Text('اختيارات ${product['name']}')),
      body: ListView(padding: const EdgeInsets.fromLTRB(18, 14, 18, 28), children: [
        sectionTitle('الاختيارات الحالية', '${productVariants.length} اختيار'),
        if (productVariants.isEmpty) mutedCard('لا توجد اختيارات لهذا المنتج.'),
        ...productVariants.map((v) => Card(child: ListTile(
          title: Text(v['name'], style: const TextStyle(fontWeight: FontWeight.w900, color: kBrown)),
          subtitle: Text('${v['price']} ج.م · المخزون ${v['stock']}'),
          trailing: IconButton(
            onPressed: () => deleteVariant(product['id'], v['id']),
            icon: const Icon(Icons.delete_rounded, color: kOrange),
          ),
        ))),
        const SizedBox(height: 20),
        const Text('إضافة اختيار جديد', style: TextStyle(fontWeight: FontWeight.w900, color: kBrown)),
        const SizedBox(height: 10),
        TextField(controller: variantNameController, decoration: const InputDecoration(labelText: 'اسم الاختيار (مثال: كبير)')),
        const SizedBox(height: 10),
        TextField(controller: variantPriceController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'السعر')),
        const SizedBox(height: 10),
        TextField(controller: variantStockController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'المخزون')),
        const SizedBox(height: 14),
        SizedBox(width: double.infinity, child: FilledButton(
          onPressed: () => saveVariant(product['id']),
          child: const Text('إضافة الاختيار'),
        )),
      ]),
    );
  }
}
