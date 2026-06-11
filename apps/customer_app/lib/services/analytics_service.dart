import 'package:facebook_app_events/facebook_app_events.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';

/// Centralised analytics facade.
///
/// Fires every event to **both** Meta (Facebook) App Events and Firebase
/// Analytics in parallel.  If either SDK throws, the error is caught and
/// logged — analytics must never crash the app.
class AnalyticsService {
  AnalyticsService._();
  static final AnalyticsService instance = AnalyticsService._();

  final _fb = FacebookAppEvents();
  final _fa = FirebaseAnalytics.instance;

  // ── Standard events ────────────────────────────────────────────────────

  /// Call after OTP verification succeeds (new or returning user).
  Future<void> logCompleteRegistration({String? method}) async {
    await _safe(() async {
      // Meta standard event
      await _fb.logCompletedRegistration(registrationMethod: method ?? 'phone');
      // Firebase
      await _fa.logSignUp(signUpMethod: method ?? 'phone');
      debugPrint('[Analytics] CompleteRegistration');
    });
  }

  /// Call when a product is added to the cart.
  Future<void> logAddToCart({
    required String productId,
    required String productName,
    required double price,
    String? currency,
  }) async {
    await _safe(() async {
      await _fb.logAddToCart(
        id: productId,
        type: 'product',
        price: price,
        currency: currency ?? 'EGP',
      );
      await _fa.logAddToCart(
        items: [
          AnalyticsEventItem(
            itemId: productId,
            itemName: productName,
            price: price,
          ),
        ],
        currency: currency ?? 'EGP',
        value: price,
      );
      debugPrint('[Analytics] AddToCart: $productId ($price)');
    });
  }

  /// Call when the checkout sheet opens.
  Future<void> logInitiateCheckout({
    required int itemCount,
    required double totalPrice,
    String? currency,
  }) async {
    await _safe(() async {
      await _fb.logInitiatedCheckout(
        totalPrice: totalPrice,
        currency: currency ?? 'EGP',
        numItems: itemCount,
      );
      await _fa.logBeginCheckout(
        currency: currency ?? 'EGP',
        value: totalPrice,
      );
      debugPrint('[Analytics] InitiateCheckout: $itemCount items, $totalPrice');
    });
  }

  /// Call after a successful order creation.
  Future<void> logPurchase({
    required String orderId,
    required double totalPrice,
    required int itemCount,
    String? currency,
  }) async {
    await _safe(() async {
      await _fb.logPurchase(amount: totalPrice, currency: currency ?? 'EGP');
      await _fa.logPurchase(
        currency: currency ?? 'EGP',
        value: totalPrice,
        transactionId: orderId,
      );
      debugPrint('[Analytics] Purchase: $orderId ($totalPrice)');
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  Future<void> _safe(Future<void> Function() action) async {
    try {
      await action();
    } catch (e) {
      debugPrint('[Analytics] error: $e');
    }
  }
}
