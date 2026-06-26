import 'dart:async';
import 'dart:io' show FileSystemException, HttpException, PathNotFoundException, Platform, SocketException;
import 'dart:ui';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';
import 'screens/main_screen.dart';

// ── Local notifications ───────────────────────────────────────────────────────
final _localNotifications = FlutterLocalNotificationsPlugin();

const _orderChannel = AndroidNotificationChannel(
  'wenzla_orders',
  'تحديثات الطلبات',
  description: 'إشعارات حالة الطلبات — تم القبول، جاري التحضير، خرج للتوصيل، تم التسليم',
  importance: Importance.high,
  enableVibration: true,
  playSound: true,
);

/// Shared group key so multiple order notifications stack cleanly.
const _kOrderGroupKey = 'com.wenzla.customer.order_updates';

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  final data = message.data;
  final hasRemoteNotification = message.notification != null;
  if (hasRemoteNotification) return;
  final title = message.notification?.title ?? data['title'] as String?;
  final body = message.notification?.body ?? data['body'] as String?;
  if (title == null && body == null) return;

  final plugin = FlutterLocalNotificationsPlugin();
  await plugin.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );
  await plugin.show(
    message.hashCode,
    title,
    body,
    const NotificationDetails(
      android: AndroidNotificationDetails(
        'wenzla_orders',
        'تحديثات الطلبات',
        channelDescription: 'إشعارات حالة الطلبات',
        importance: Importance.high,
        priority: Priority.high,
        enableVibration: true,
        playSound: true,
      ),
    ),
  );
}

/// Returns true when the error originates from a network/image load
/// operation — these are handled silently via errorBuilder widgets and
/// must NOT be recorded as fatal crashes in Crashlytics.
bool _isImageOrNetworkError(Object exception) {
  if (exception is NetworkImageLoadException) return true;
  if (exception is HttpException) return true;
  if (exception is SocketException) return true;
  if (exception is PathNotFoundException) return true;
  if (exception is FileSystemException) return true;
  final msg = exception.toString().toLowerCase();
  return msg.contains('image resource service') ||
      msg.contains('failed to load network image') ||
      msg.contains('invalid image data') ||
      msg.contains('http request failed') ||
      msg.contains('pathnotfoundexception') ||
      msg.contains('no such file or directory');
}

void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    await Firebase.initializeApp();

    // Always enable Crashlytics collection in release/profile builds.
    // In debug builds keep it disabled so iterative hot-reload errors
    // do not pollute the console.
    if (!kDebugMode) {
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
    }

    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      if (kDebugMode) {
        debugPrint(details.exceptionAsString());
        debugPrintStack(stackTrace: details.stack);
      }
      // Image / network loading failures: show placeholder, skip fatal report.
      if (_isImageOrNetworkError(details.exception)) {
        FirebaseCrashlytics.instance.recordError(
          details.exception,
          details.stack,
          reason: 'image-load-error (non-fatal)',
          fatal: false,
        );
        return;
      }
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      if (kDebugMode) {
        debugPrint(error.toString());
        debugPrintStack(stackTrace: stack);
      }
      // Image / network loading failures are non-fatal.
      final fatal = !_isImageOrNetworkError(error);
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: fatal);
      return true;
    };

    try {
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (e) {
      debugPrint('[FCM] requestPermission failed: $e');
    }
    FirebaseMessaging.onBackgroundMessage(_bgHandler);

    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_orderChannel);

    FirebaseMessaging.onMessage.listen((RemoteMessage msg) {
      final n = msg.notification;
      if (n == null) return;
      _localNotifications.show(
        n.hashCode,
        n.title,
        n.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _orderChannel.id,
            _orderChannel.name,
            channelDescription: _orderChannel.description,
            icon: '@mipmap/ic_launcher',
            importance: Importance.high,
            priority: Priority.high,
            enableVibration: true,
            playSound: true,
            groupKey: _kOrderGroupKey,
          ),
        ),
      );
    });

    // Set static Crashlytics keys as early as possible.
    await _setCrashlyticsStaticKeys();

    runApp(const SouqAlAsalApp());
  }, (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
  });
}

/// Sets keys that do not change during the session (app version, build, etc).
/// User-specific keys are updated from [AppState] after login.
Future<void> _setCrashlyticsStaticKeys() async {
  try {
    final info = await PackageInfo.fromPlatform();
    final crashlytics = FirebaseCrashlytics.instance;
    await crashlytics.setCustomKey('appVersion', info.version);
    await crashlytics.setCustomKey('buildNumber', info.buildNumber);
    if (Platform.isAndroid) {
      await crashlytics.setCustomKey('platform', 'android');
    } else if (Platform.isIOS) {
      await crashlytics.setCustomKey('platform', 'ios');
    }
  } catch (e) {
    debugPrint('[Crashlytics] Failed to set static keys: $e');
  }
}

class SouqAlAsalApp extends StatelessWidget {
  const SouqAlAsalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..initAuth()..loadCart(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'سوق العسل',
        theme: AppTheme.light,
        locale: const Locale('ar', 'EG'),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child!,
        ),
        home: const _AppRoot(),
      ),
    );
  }
}

class _AppRoot extends StatefulWidget {
  const _AppRoot();
  @override
  State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  @override
  void initState() {
    super.initState();
    _registerFcm();
    _setupNotificationTapHandlers();
    _attachAppStateListeners();
  }

  void _attachAppStateListeners() {
    final state = context.read<AppState>();
    state.addListener(_onAppStateChanged);
    _syncCrashlyticsUserKeys(state);
  }

  void _onAppStateChanged() {
    _syncCrashlyticsUserKeys(context.read<AppState>());
  }

  Future<void> _syncCrashlyticsUserKeys(AppState state) async {
    try {
      final crashlytics = FirebaseCrashlytics.instance;
      final userId = state.user?['id']?.toString();
      if (userId != null && userId.isNotEmpty) {
        await crashlytics.setUserIdentifier(userId);
        await crashlytics.setCustomKey('userId', userId);
      }
    } catch (e) {
      debugPrint('[Crashlytics] Failed to sync user keys: $e');
    }
  }

  Future<void> _registerFcm() async {
    try {
      final token = await FirebaseMessaging.instance
          .getToken()
          .timeout(const Duration(seconds: 10));
      if (token != null && mounted) {
        context.read<AppState>().updateFcmToken(token);
      }
      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        if (mounted) context.read<AppState>().updateFcmToken(t);
      });
    } catch (e, stack) {
      debugPrint('[FCM] token registration failed: $e');
      FirebaseCrashlytics.instance.recordError(
        e,
        stack,
        reason: 'FCM getToken failed (MISSING_INSTANCEID_SERVICE or timeout)',
        fatal: false,
      );
    }
  }

  void _setupNotificationTapHandlers() {
    // App was killed → launched by tapping a notification
    FirebaseMessaging.instance.getInitialMessage().then((msg) {
      if (msg != null && mounted) _handleTap(msg);
    });
    // App was backgrounded → brought to front by tapping a notification
    FirebaseMessaging.onMessageOpenedApp.listen((msg) {
      if (mounted) _handleTap(msg);
    });
  }

  void _handleTap(RemoteMessage msg) {
    final type = msg.data['type'] as String? ?? '';
    final orderId = msg.data['orderId'] as String?;

    const orderTypes = {
      'order_update',
      'order_placed',
      'order_confirmed',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
    };

    if (orderTypes.contains(type)) {
      final state = context.read<AppState>();
      if (orderId != null) {
        state.setPendingOpenOrderId(orderId);
        FirebaseCrashlytics.instance.setCustomKey('pendingOpenOrderId', orderId);
      }
      state.showScreen(AppScreen.orders, bottomIndex: 1);
    }
  }

  @override
  Widget build(BuildContext context) => const MainScreen();
}
