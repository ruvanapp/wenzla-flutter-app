import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../theme/colors.dart';
import 'home/home_screen.dart';
import 'cart/cart_screen.dart';
import 'orders/orders_screen.dart';
import 'auth/login_screen.dart';
import 'store_detail/store_detail_screen.dart';
import 'product_detail/product_detail_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  // Used for "press back again to exit" protection on the root home screen.
  DateTime? _lastBackPress;

  /// Returns true if the back press was consumed (handled internally).
  /// Returns false to allow the system to handle it (exit the app).
  bool _handleBack(BuildContext context) {
    final st = context.read<AppState>();

    // Product detail → go back to store (or home if no store was open)
    if (st.screen == AppScreen.productDetail) {
      st.closeProduct();
      return true;
    }

    // Store detail → restore the tab that was active before opening the store
    if (st.screen == AppScreen.storeDetail) {
      st.closeStore();
      // If we restored to the orders tab, silently refresh
      if (st.bottomIndex == 1) st.silentRefreshOrders();
      return true;
    }

    // Any non-home bottom tab → go back to home tab
    if (st.bottomIndex != 0) {
      st.showScreen(AppScreen.home, bottomIndex: 0);
      return true;
    }

    // Already on root home screen → "press again to exit" toast
    final now = DateTime.now();
    if (_lastBackPress == null ||
        now.difference(_lastBackPress!) > const Duration(seconds: 2)) {
      _lastBackPress = now;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'اضغط مرة أخرى للخروج',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
          margin: EdgeInsets.fromLTRB(32, 0, 32, 32),
        ),
      );
      return true; // consumed — wait for second back press
    }

    // Second back press within 2 seconds → exit app
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final st = context.watch<AppState>();

    // Full-screen overlay screens handled at the top level
    Widget body;
    if (st.screen == AppScreen.storeDetail) {
      body = const StoreDetailScreen();
    } else if (st.screen == AppScreen.productDetail) {
      body = const ProductDetailScreen();
    } else {
      body = Scaffold(
        body: IndexedStack(
          index: st.bottomIndex.clamp(0, 3),
          children: const [
            HomeScreen(),    // 0 — الرئيسية
            OrdersScreen(),  // 1 — طلباتي
            CartScreen(),    // 2 — السلة
            LoginScreen(),   // 3 — حسابي
          ],
        ),
        bottomNavigationBar: _buildBottomNav(context, st),
      );
    }

    // PopScope intercepts Android back button before Flutter's navigator
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return; // already handled
        final consumed = _handleBack(context);
        if (!consumed) {
          // Allow system to exit the app
          SystemNavigator.pop();
        }
      },
      child: body,
    );
  }

  Widget _buildBottomNav(BuildContext context, AppState st) {
    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        // Subtle warm top divider line
        border: Border(
          top: BorderSide(color: kBorder.withOpacity(0.35), width: 0.5),
        ),
        boxShadow: kNavShadow,
      ),
      child: SafeArea(
        top: false,
        child: NavigationBar(
          selectedIndex: st.bottomIndex.clamp(0, 3),
          onDestinationSelected: (i) {
            final st = context.read<AppState>();
            st.showScreen(_indexToScreen(i), bottomIndex: i);
            // Silently refresh orders whenever the orders tab becomes active
            // (IndexedStack keeps OrdersScreen alive so initState never re-fires)
            if (i == 1) st.silentRefreshOrders();
          },
          destinations: _buildDestinations(st),
          height: 64,
          backgroundColor:  kSurface,
          surfaceTintColor: Colors.transparent,
          indicatorColor:   kHoney.withOpacity(0.13),
          labelBehavior:    NavigationDestinationLabelBehavior.alwaysShow,
          animationDuration: const Duration(milliseconds: 250),
        ),
      ),
    );
  }

  List<NavigationDestination> _buildDestinations(AppState st) {
    return [
      const NavigationDestination(
        icon:         Icon(Icons.storefront_outlined),
        selectedIcon: Icon(Icons.storefront_rounded),
        label:        'الرئيسية',
      ),
      const NavigationDestination(
        icon:         Icon(Icons.receipt_long_outlined),
        selectedIcon: Icon(Icons.receipt_long_rounded),
        label:        'طلباتي',
      ),
      NavigationDestination(
        icon:         _badgeIcon(Icons.shopping_bag_outlined, st.cartCount),
        selectedIcon: _badgeIcon(Icons.shopping_bag_rounded, st.cartCount),
        label:        'السلة',
      ),
      const NavigationDestination(
        icon:         Icon(Icons.person_outline_rounded),
        selectedIcon: Icon(Icons.person_rounded),
        label:        'حسابي',
      ),
    ];
  }

  AppScreen _indexToScreen(int i) {
    switch (i) {
      case 1:  return AppScreen.orders;
      case 2:  return AppScreen.cart;
      case 3:  return AppScreen.login;
      default: return AppScreen.home;
    }
  }

  Widget _badgeIcon(IconData icon, int count) {
    if (count == 0) return Icon(icon);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        Positioned(
          right: -6, top: -6,
          child: Container(
            width: 16, height: 16,
            decoration: const BoxDecoration(
              color: kError, shape: BoxShape.circle),
            child: Center(child: Text(
              count > 9 ? '9+' : '$count',
              style: const TextStyle(
                color: Colors.white, fontSize: 9,
                fontWeight: FontWeight.w700),
            )),
          ),
        ),
      ],
    );
  }
}
