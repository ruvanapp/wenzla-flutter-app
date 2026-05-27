import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _ss = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

/// Current cart schema version.
/// Increment this whenever the cart item structure changes in a
/// breaking way — the old key is automatically abandoned and a fresh
/// empty cart is used.  No explicit migration code needed: callers
/// just start with an empty cart and will persist to the new key.
const int _kCartSchemaVersion = 2;

/// SharedPreferences key used for the current cart version.
const String _kCartKey        = 'cart_data_v$_kCartSchemaVersion';

/// Legacy key from schema v1 (pre merchantId enforcement).
const String _kCartKeyLegacy  = 'cart_data';

class StorageService {
  StorageService._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<void> saveAuth(String token, Map<String, dynamic> user) async {
    try {
      await _ss.write(key: 'auth_token', value: token);
      await _ss.write(key: 'auth_user',  value: jsonEncode(user));
    } catch (_) {
      // Secure storage write failed — auth may not persist across restarts
      // but the in-memory token is still valid for this session.
    }
  }

  static Future<({String? token, Map<String, dynamic>? user})> loadAuth() async {
    try {
      final token = await _ss.read(key: 'auth_token');
      final raw   = await _ss.read(key: 'auth_user');
      Map<String, dynamic>? user;
      if (raw != null) {
        try { user = jsonDecode(raw) as Map<String, dynamic>; } catch (_) {}
      }
      return (token: token, user: user);
    } catch (_) {
      // Secure storage read failed (e.g. first run after OS upgrade, key lost)
      return (token: null, user: null);
    }
  }

  static Future<void> clearAuth() async {
    try {
      await _ss.delete(key: 'auth_token');
      await _ss.delete(key: 'auth_user');
    } catch (_) {}
  }

  // ── Cart ──────────────────────────────────────────────────────────────────
  //
  // Cart items are stored as a JSON array under [_kCartKey].
  //
  // Recovery contract (defence-in-depth):
  //   • If the key is absent          → empty cart (normal fresh install).
  //   • If JSON is unparseable        → clear the key + return empty cart.
  //   • If top-level is not a List    → clear the key + return empty cart.
  //   • If an item fails validation   → silently drop that item; re-save.
  //   • On any save error             → swallow; in-memory state is still
  //                                     correct; worst case is lost on restart.
  //
  // Migration from v1 (legacy key):
  //   • On first run after upgrade the v2 key is absent.
  //   • We try to read the legacy key, validate items, and write to v2.
  //   • Items that pass validation are carried over; invalid ones are dropped.
  //   • The legacy key is then removed.

  static Future<List<Map<String, dynamic>>> loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // ── 1. Try current versioned key ──────────────────────────────────────
      String? raw = prefs.getString(_kCartKey);

      // ── 2. Legacy key migration (v1 → v2) ───────────────────────────────
      bool migratedFromLegacy = false;
      if (raw == null && prefs.containsKey(_kCartKeyLegacy)) {
        raw = prefs.getString(_kCartKeyLegacy);
        // Remove legacy key regardless of whether migration succeeds.
        await prefs.remove(_kCartKeyLegacy);
        migratedFromLegacy = true;
      }

      if (raw == null) return [];

      // ── 3. Parse ──────────────────────────────────────────────────────────
      late final dynamic decoded;
      try {
        decoded = jsonDecode(raw);
      } catch (_) {
        // Completely unparseable JSON (e.g. truncated write from a crash).
        await prefs.remove(_kCartKey);
        return [];
      }

      // ── 4. Top-level type guard ───────────────────────────────────────────
      if (decoded is! List) {
        // e.g. stored as Map or primitive — corrupted.
        await prefs.remove(_kCartKey);
        return [];
      }

      // ── 5. Per-item validation and coercion ───────────────────────────────
      final items = <Map<String, dynamic>>[];
      for (final rawItem in decoded) {
        if (rawItem is! Map) continue;                      // not a map — skip
        final item = rawItem.map((k, v) => MapEntry(k.toString(), v));
        if (!_isValidItem(item)) continue;              // missing required fields
        items.add(_coerceItem(item));                   // normalise types
      }

      // ── 6. Re-save cleaned cart ───────────────────────────────────────────
      // Always save when migrated from legacy (so v2 key is set for next cold
      // start). Also save when any items were dropped so the cleaned list is
      // persisted.
      if (migratedFromLegacy || items.length != decoded.length) {
        await _writeCartRaw(prefs, items);
      }

      return items;

    } catch (_) {
      // Absolute last-resort: SharedPreferences itself failed to initialise.
      return [];
    }
  }

  /// Validate that a cart item has the minimum fields required for display
  /// AND checkout.  Items from app versions that did not include [merchantId]
  /// are deliberately rejected so they don't silently break the single-store
  /// enforcement or produce null-merchantId checkout requests.
  static bool _isValidItem(Map<String, dynamic> item) {
    if (item['id']         == null) return false;
    if (item['name']       == null) return false;
    if (item['merchantId'] == null) return false;
    // Must have at least one price representation.
    if (item['price'] == null && item['salePrice'] == null) return false;
    return true;
  }

  /// Normalise types that can differ between JSON-encode/decode cycles or
  /// between app versions:
  ///   • [qty]        : may arrive as int, double, or String  → coerce to int
  ///   • [price]      : may arrive as int or String           → coerce to double
  ///   • [salePrice]  : same
  static Map<String, dynamic> _coerceItem(Map<String, dynamic> item) {
    return {
      ...item,
      'qty': _toInt(item['qty']) ?? 1,
      if (item['price']     != null) 'price':     _toDouble(item['price'])     ?? 0.0,
      if (item['salePrice'] != null) 'salePrice': _toDouble(item['salePrice']) ?? 0.0,
    };
  }

  static int?    _toInt(dynamic v) {
    if (v == null) return null;
    if (v is int)  return v;
    if (v is num)  return v.toInt();          // covers double: 2.0 → 2
    final s = v.toString().split('.').first;  // "2.0" → "2" as string
    return int.tryParse(s);
  }
  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is num)    return v.toDouble();     // covers int: 300 → 300.0
    return double.tryParse(v.toString());
  }

  static Future<void> saveCart(List<dynamic> cart) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Only persist valid items — never write garbage to disk.
      final clean = cart
          .whereType<Map>()
          .map((i) => i.map((k, v) => MapEntry(k.toString(), v)))
          .where(_isValidItem)
          .toList();
      await _writeCartRaw(prefs, clean);
    } catch (_) {
      // Save failed (disk full, prefs locked, etc.).
      // In-memory state is still correct; the cart will be lost on next
      // cold start but the app will NOT crash.
    }
  }

  static Future<void> clearCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_kCartKey);
      await prefs.remove(_kCartKeyLegacy); // belt-and-braces
    } catch (_) {}
  }

  static Future<void> _writeCartRaw(
    SharedPreferences prefs,
    List<dynamic> items,
  ) async {
    await prefs.setString(_kCartKey, jsonEncode(items));
  }
}
