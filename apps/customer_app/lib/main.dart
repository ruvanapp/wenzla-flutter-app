import 'dart:async';
import 'dart:ui';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';
import 'screens/main_screen.dart';

// ── Local notifications ───────────────────────────────────────────────────────
final _localNotifications = FlutterLocalNotificationsPlugin();

const _orderChannel = AndroidNotificationChannel(
  'wenzla_orders',
  'تحديثات الطلبات',
  description: 'إشعارات حالة الطلبات',
  importance: Importance.high,
);

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp();

  FlutterError.onError =
      FirebaseCrashlytics.instance.recordFlutterFatalError;
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  await FirebaseMessaging.instance.requestPermission(
    alert: true, badge: true, sound: true,
  );
  FirebaseMessaging.onBackgroundMessage(_bgHandler);

  await _localNotifications.initialize(const InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
  ));
  await _localNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_orderChannel);

  FirebaseMessaging.onMessage.listen((RemoteMessage msg) {
    final n = msg.notification;
    if (n == null) return;
    _localNotifications.show(
      n.hashCode, n.title, n.body,
      NotificationDetails(android: AndroidNotificationDetails(
        _orderChannel.id, _orderChannel.name,
        channelDescription: _orderChannel.description,
        icon: '@mipmap/ic_launcher',
      )),
    );
  });

  runZonedGuarded(
    () => runApp(const SouqAlAsalApp()),
    (error, stack) =>
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true),
  );
}

class SouqAlAsalApp extends StatelessWidget {
  const SouqAlAsalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..initAuth()..loadCart(),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title:   'سوق العسل',
        theme:   AppTheme.light,
        locale:  const Locale('ar', 'EG'),
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
  @override State<_AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<_AppRoot> {
  @override
  void initState() {
    super.initState();
    _registerFcm();
  }

  Future<void> _registerFcm() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null && mounted) {
      context.read<AppState>().updateFcmToken(token);
    }
    FirebaseMessaging.instance.onTokenRefresh.listen((t) {
      if (mounted) context.read<AppState>().updateFcmToken(t);
    });
  }

  @override
  Widget build(BuildContext context) => const MainScreen();
}
