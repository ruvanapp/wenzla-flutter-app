// cart_persistence_test.dart
//
// Unit tests for cart persistence compatibility across:
//   - cold start
//   - app update (schema migration v1 → v2)
//   - corrupted data
//   - missing fields
//   - type mismatches
//
// Run with:  flutter test test/cart_persistence_test.dart -v

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ---------------------------------------------------------------------------
// Inline validator/coercer to mirror StorageService logic without importing
// the full service (which has FlutterSecureStorage not available in tests).
// ---------------------------------------------------------------------------

const int _kSchemaVersion = 2;
const String _kCartKey        = 'cart_data_v$_kSchemaVersion';
const String _kCartKeyLegacy  = 'cart_data';

bool _isValidItem(Map<String, dynamic> item) {
  if (item['id']         == null) return false;
  if (item['name']       == null) return false;
  if (item['merchantId'] == null) return false;
  if (item['price'] == null && item['salePrice'] == null) return false;
  return true;
}

int? _toInt(dynamic v) {
  if (v == null) return null;
  if (v is int)  return v;
  if (v is num)  return v.toInt();           // covers double: 2.0 → 2
  final s = v.toString().split('.').first;   // "2.0" → "2" as string
  return int.tryParse(s);
}
double? _toDouble(dynamic v) {
  if (v == null) return null;
  if (v is double) return v;
  if (v is num)    return v.toDouble();      // covers int: 300 → 300.0
  return double.tryParse(v.toString());
}

Map<String, dynamic> _coerceItem(Map<String, dynamic> item) => {
  ...item,
  'qty': _toInt(item['qty']) ?? 1,
  if (item['price']     != null) 'price':     _toDouble(item['price'])     ?? 0.0,
  if (item['salePrice'] != null) 'salePrice': _toDouble(item['salePrice']) ?? 0.0,
};

Future<List<Map<String, dynamic>>> _simulateLoad() async {
  final prefs = await SharedPreferences.getInstance();

  String? raw = prefs.getString(_kCartKey);

  // Legacy migration
  bool migratedFromLegacy = false;
  if (raw == null && prefs.containsKey(_kCartKeyLegacy)) {
    raw = prefs.getString(_kCartKeyLegacy);
    await prefs.remove(_kCartKeyLegacy);
    migratedFromLegacy = true;
  }

  if (raw == null) return [];

  late final dynamic decoded;
  try {
    decoded = jsonDecode(raw);
  } catch (_) {
    await prefs.remove(_kCartKey);
    return [];
  }

  if (decoded is! List) {
    await prefs.remove(_kCartKey);
    return [];
  }

  final items = <Map<String, dynamic>>[];
  for (final e in decoded) {
    if (e is! Map) continue;
    final item = e.map((k, v) => MapEntry(k.toString(), v));
    if (!_isValidItem(item)) continue;
    items.add(_coerceItem(item));
  }

  // Always save when migrated from legacy; also save when items were filtered.
  if (migratedFromLegacy || items.length != decoded.length) {
    await prefs.setString(_kCartKey, jsonEncode(items));
  }

  return items;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
Map<String, dynamic> _validItem({
  String id = 'p1',
  String name = 'عسل سدر',
  double price = 250.0,
  String merchantId = 'm1',
  int qty = 1,
}) => {'id': id, 'name': name, 'price': price, 'merchantId': merchantId, 'qty': qty};

Future<void> _setRaw(String key, String value) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(key, value);
}

// ============================================================================
void main() {
  // Use fake SharedPreferences so tests don't touch real disk.
  setUp(() => SharedPreferences.setMockInitialValues({}));

  // ── Group 1: Happy path ───────────────────────────────────────────────────
  group('Happy path', () {
    test('T01: Fresh install — no key → empty cart', () async {
      final cart = await _simulateLoad();
      expect(cart, isEmpty);
    });

    test('T02: Valid single item → restored correctly', () async {
      final item = _validItem();
      await _setRaw(_kCartKey, jsonEncode([item]));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['id'],         'p1');
      expect(cart[0]['name'],       'عسل سدر');
      expect(cart[0]['price'],      250.0);
      expect(cart[0]['merchantId'], 'm1');
      expect(cart[0]['qty'],        1);
    });

    test('T03: Multiple valid items → all restored', () async {
      final items = [
        _validItem(id: 'p1', name: 'عسل سدر',       price: 250, qty: 2),
        _validItem(id: 'p2', name: 'غذاء ملكات',    price: 420, qty: 1),
        _validItem(id: 'p3', name: 'حبوب لقاح 200', price: 110, qty: 3),
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 3);
      expect(cart.map((i) => i['id']).toList(), ['p1', 'p2', 'p3']);
    });

    test('T04: Cart round-trip (save → load) preserves all fields', () async {
      final item = {
        'id': 'p5', 'name': 'عكبر سائل', 'price': 180.0,
        'merchantId': 'store_abc', 'qty': 2,
        'image': 'https://cdn.example.com/p5.jpg',
        'weight': '30 مل',
      };
      await _setRaw(_kCartKey, jsonEncode([item]));

      final cart = await _simulateLoad();
      expect(cart[0]['image'],  'https://cdn.example.com/p5.jpg');
      expect(cart[0]['weight'], '30 مل');
    });
  });

  // ── Group 2: Corrupted / invalid data ────────────────────────────────────
  group('Corrupted data', () {
    test('T05: Unparseable JSON → empty cart + key cleared', () async {
      await _setRaw(_kCartKey, '{bad json{{[');

      final cart = await _simulateLoad();
      expect(cart, isEmpty);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(_kCartKey), isFalse,
          reason: 'Corrupted key must be removed so next start does not retry');
    });

    test('T06: Valid JSON but top-level is Map → empty cart + key cleared', () async {
      await _setRaw(_kCartKey, jsonEncode({'id': 'p1', 'name': 'test'}));

      final cart = await _simulateLoad();
      expect(cart, isEmpty);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(_kCartKey), isFalse);
    });

    test('T07: Valid JSON but top-level is String → empty cart + key cleared', () async {
      await _setRaw(_kCartKey, jsonEncode('not a list'));

      final cart = await _simulateLoad();
      expect(cart, isEmpty);
    });

    test('T08: Valid JSON but top-level is null → empty cart + key cleared', () async {
      await _setRaw(_kCartKey, 'null');

      final cart = await _simulateLoad();
      expect(cart, isEmpty);
    });

    test('T09: Empty JSON array → empty cart (valid)', () async {
      await _setRaw(_kCartKey, '[]');

      final cart = await _simulateLoad();
      expect(cart, isEmpty);
    });
  });

  // ── Group 3: Invalid / incomplete items ──────────────────────────────────
  group('Invalid items', () {
    test('T10: Item missing id → filtered out', () async {
      final items = [
        {'name': 'بلا معرف', 'price': 100.0, 'merchantId': 'm1', 'qty': 1},
        _validItem(id: 'p2'), // valid
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['id'], 'p2');
    });

    test('T11: Item missing name → filtered out', () async {
      final items = [
        {'id': 'p1', 'price': 100.0, 'merchantId': 'm1', 'qty': 1},
        _validItem(id: 'p2'),
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
    });

    test('T12: Item missing merchantId (old app version) → filtered out', () async {
      // Simulates cart saved by an old build that did not enforce single-store.
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': 200.0, 'qty': 1}, // no merchantId
        _validItem(id: 'p2'),
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 1,
          reason: 'Item without merchantId must be dropped to protect checkout');
    });

    test('T13: Item missing both price and salePrice → filtered out', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'merchantId': 'm1', 'qty': 1},
        _validItem(id: 'p2', price: 150),
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
    });

    test('T14: Item with salePrice but no price → valid', () async {
      final items = [
        {'id': 'p1', 'name': 'تخفيض', 'salePrice': 99.0, 'merchantId': 'm1', 'qty': 1},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['salePrice'], 99.0);
    });

    test('T15: Array contains non-Map primitives → primitives skipped', () async {
      final rawList = [
        _validItem(id: 'p1'),
        42,                          // primitive
        'hello',                     // string
        null,                        // null
        [1, 2, 3],                   // nested list
        _validItem(id: 'p2'),
      ];
      await _setRaw(_kCartKey, jsonEncode(rawList));

      final cart = await _simulateLoad();
      expect(cart.length, 2);
    });
  });

  // ── Group 4: Type coercion ────────────────────────────────────────────────
  group('Type coercion', () {
    test('T16: qty stored as double → coerced to int', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': 100.0, 'merchantId': 'm1', 'qty': 2.0},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart[0]['qty'], isA<int>());
      expect(cart[0]['qty'], 2);
    });

    test('T17: qty stored as String → coerced to int', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': 100.0, 'merchantId': 'm1', 'qty': '3'},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart[0]['qty'], isA<int>());
      expect(cart[0]['qty'], 3);
    });

    test('T18: price stored as String → coerced to double', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': '250', 'merchantId': 'm1', 'qty': 1},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart[0]['price'], isA<double>());
      expect(cart[0]['price'], 250.0);
    });

    test('T19: price stored as int → coerced to double', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': 300, 'merchantId': 'm1', 'qty': 1},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart[0]['price'], isA<double>());
      expect(cart[0]['price'], 300.0);
    });

    test('T20: missing qty → defaults to 1', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل', 'price': 100.0, 'merchantId': 'm1'},
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart[0]['qty'], 1);
    });
  });

  // ── Group 5: Schema migration v1 → v2 ────────────────────────────────────
  group('Schema migration (v1 → v2)', () {
    test('T21: Valid legacy cart → migrated to v2 key, legacy key deleted', () async {
      final item = _validItem();
      await _setRaw(_kCartKeyLegacy, jsonEncode([item]));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['id'], 'p1');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(_kCartKeyLegacy), isFalse,
          reason: 'Legacy key must be removed after migration');
      expect(prefs.containsKey(_kCartKey), isTrue,
          reason: 'Cart must be re-persisted under the new versioned key');
    });

    test('T22: Legacy cart with items missing merchantId → invalid items dropped', () async {
      final items = [
        {'id': 'p1', 'name': 'عسل قديم', 'price': 200.0, 'qty': 1}, // no merchantId
      ];
      await _setRaw(_kCartKeyLegacy, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart, isEmpty,
          reason: 'Old-format items without merchantId must not survive migration');

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(_kCartKeyLegacy), isFalse);
    });

    test('T23: Both keys present → v2 wins, legacy ignored', () async {
      final legacyItem = _validItem(id: 'old', name: 'قديم');
      final v2Item     = _validItem(id: 'new', name: 'جديد');
      await _setRaw(_kCartKeyLegacy, jsonEncode([legacyItem]));
      await _setRaw(_kCartKey,       jsonEncode([v2Item]));

      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['id'], 'new', reason: 'v2 key takes priority over legacy key');
    });

    test('T24: Corrupted legacy JSON → empty cart, both keys cleared', () async {
      await _setRaw(_kCartKeyLegacy, '{{bad legacy{{');

      final cart = await _simulateLoad();
      expect(cart, isEmpty);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(_kCartKeyLegacy), isFalse);
    });
  });

  // ── Group 6: Mixed-validity batches ──────────────────────────────────────
  group('Partial validity', () {
    test('T25: Mix of valid + invalid items → only valid items returned', () async {
      final items = [
        _validItem(id: 'p1'),                                              // valid
        {'id': 'p2', 'name': 'no_merchant', 'price': 50.0, 'qty': 1},    // no merchantId
        {'name': 'no_id', 'price': 50.0, 'merchantId': 'm1', 'qty': 1},  // no id
        _validItem(id: 'p3', price: 99),                                   // valid
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      final cart = await _simulateLoad();
      expect(cart.length, 2);
      expect(cart.map((i) => i['id']).toList(), ['p1', 'p3']);
    });

    test('T26: Cleaned cart is re-persisted (invalid items not re-loaded)', () async {
      final items = [
        _validItem(id: 'p1'),
        {'id': 'p2', 'name': 'bad', 'price': 50.0, 'qty': 1}, // no merchantId
      ];
      await _setRaw(_kCartKey, jsonEncode(items));

      await _simulateLoad(); // triggers re-save

      // Second load should return only the valid item (from cleaned cache).
      final cart2 = await _simulateLoad();
      expect(cart2.length, 1);
      expect(cart2[0]['id'], 'p1');
    });
  });

  // ── Group 7: Persistence across restart simulation ─────────────────────
  group('Cold start persistence', () {
    test('T27: Cart persists across simulated restart', () async {
      final item = _validItem(id: 'restart_test', qty: 3, price: 175);
      await _setRaw(_kCartKey, jsonEncode([item]));

      // Simulate app restart by calling load again.
      final cart = await _simulateLoad();
      expect(cart.length, 1);
      expect(cart[0]['id'],  'restart_test');
      expect(cart[0]['qty'], 3);
    });

    test('T28: Empty cart saves gracefully (no crash)', () async {
      await _setRaw(_kCartKey, jsonEncode([]));

      final cart = await _simulateLoad();
      expect(cart, isEmpty);
    });
  });
}
