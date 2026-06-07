import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight stale-while-revalidate disk cache for Home screen data.
///
/// Stores JSON responses from home APIs with a timestamp.
/// On cold launch, returns cached data immediately so the UI can render
/// without waiting for the network. The caller then refreshes in background.
class HomeCacheService {
  HomeCacheService._();

  static const _keyStores     = 'home_cache_stores';
  static const _keyStoresTs   = 'home_cache_stores_ts';
  static const _keyCms        = 'home_cache_cms';
  static const _keyCmsTs      = 'home_cache_cms_ts';
  static const _keyCategories = 'home_cache_categories';
  static const _keyCategoriesTs = 'home_cache_categories_ts';

  /// TTL durations in milliseconds.
  static const int _ttlStoresMs     = 5 * 60 * 1000;  // 5 minutes
  static const int _ttlCmsMs        = 5 * 60 * 1000;  // 5 minutes
  static const int _ttlCategoriesMs = 10 * 60 * 1000; // 10 minutes

  // ── Stores ────────────────────────────────────────────────────────────────

  /// Returns cached stores list, or null if no cache exists.
  /// Data is returned regardless of TTL (stale-while-revalidate pattern).
  /// Use [isStoresCacheFresh] to decide whether to skip network refresh.
  static Future<List<dynamic>?> loadStores() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_keyStores);
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        debugPrint('[HomeCache] stores: cache HIT (${decoded.length} items)');
        return decoded;
      }
      return null;
    } catch (e) {
      debugPrint('[HomeCache] stores: load error: $e');
      return null;
    }
  }

  static Future<void> saveStores(List<dynamic> stores) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyStores, jsonEncode(stores));
      await prefs.setInt(_keyStoresTs, DateTime.now().millisecondsSinceEpoch);
      debugPrint('[HomeCache] stores: saved ${stores.length} items');
    } catch (_) {}
  }

  static Future<bool> isStoresCacheFresh() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ts = prefs.getInt(_keyStoresTs);
      if (ts == null) return false;
      return (DateTime.now().millisecondsSinceEpoch - ts) < _ttlStoresMs;
    } catch (_) {
      return false;
    }
  }

  // ── CMS (banners, categories, featured stores, sections) ──────────────────

  static Future<Map<String, dynamic>?> loadCms() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_keyCms);
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        debugPrint('[HomeCache] CMS: cache HIT');
        return decoded;
      }
      return null;
    } catch (e) {
      debugPrint('[HomeCache] CMS: load error: $e');
      return null;
    }
  }

  static Future<void> saveCms(Map<String, dynamic> cms) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyCms, jsonEncode(cms));
      await prefs.setInt(_keyCmsTs, DateTime.now().millisecondsSinceEpoch);
      debugPrint('[HomeCache] CMS: saved');
    } catch (_) {}
  }

  static Future<bool> isCmsCacheFresh() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ts = prefs.getInt(_keyCmsTs);
      if (ts == null) return false;
      return (DateTime.now().millisecondsSinceEpoch - ts) < _ttlCmsMs;
    } catch (_) {
      return false;
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────

  static Future<List<dynamic>?> loadCategories() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_keyCategories);
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        debugPrint('[HomeCache] categories: cache HIT (${decoded.length} items)');
        return decoded;
      }
      return null;
    } catch (e) {
      debugPrint('[HomeCache] categories: load error: $e');
      return null;
    }
  }

  static Future<void> saveCategories(List<dynamic> categories) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyCategories, jsonEncode(categories));
      await prefs.setInt(_keyCategoriesTs, DateTime.now().millisecondsSinceEpoch);
      debugPrint('[HomeCache] categories: saved ${categories.length} items');
    } catch (_) {}
  }

  static Future<bool> isCategoriesCacheFresh() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ts = prefs.getInt(_keyCategoriesTs);
      if (ts == null) return false;
      return (DateTime.now().millisecondsSinceEpoch - ts) < _ttlCategoriesMs;
    } catch (_) {
      return false;
    }
  }
}
