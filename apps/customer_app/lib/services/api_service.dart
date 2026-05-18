import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

const String kApiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://wenzla-backend-production.up.railway.app',
);

class ApiService {
  final String? token;
  const ApiService({this.token});

  Map<String, String> _headers({bool auth = false}) {
    final h = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept':       'application/json',
    };
    if (auth && token != null) h['Authorization'] = 'Bearer $token';
    return h;
  }

  Future<dynamic> get(String path, {bool auth = false}) async {
    final uri = Uri.parse('$kApiUrl$path');
    try {
      final res = await http.get(uri, headers: _headers(auth: auth))
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return null;
    }
  }

  Future<dynamic> post(String path, Map<String, dynamic> body,
      {bool auth = false}) async {
    final uri = Uri.parse('$kApiUrl$path');
    try {
      final res = await http
          .post(uri, headers: _headers(auth: auth), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return null;
    }
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body,
      {bool auth = false}) async {
    final uri = Uri.parse('$kApiUrl$path');
    try {
      final res = await http
          .patch(uri, headers: _headers(auth: auth), body: jsonEncode(body))
          .timeout(const Duration(seconds: 15));
      return _parse(res);
    } catch (e) {
      return null;
    }
  }

  dynamic _parse(http.Response res) {
    // Log non-2xx responses to aid debugging (visible in `adb logcat -s flutter`)
    if (res.statusCode < 200 || res.statusCode >= 300) {
      debugPrint('[API] ${res.statusCode} ${res.request?.url}: ${res.body}');
    }
    try {
      return jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      return null;
    }
  }

  /// Normalise Egyptian phone number to +20XXXXXXXXXX
  static String normalisePhone(String raw) {
    var s = raw.trim();
    // remove non-digit except leading +
    s = s.replaceAll(RegExp(r'[\s\-()]'), '');
    if (s.startsWith('+')) {
      // Fix double-prefix: +2001XXXXXXXXX (dial code + Egyptian local with trunk 0)
      // +20 (2 chars) + 01XXXXXXXXX (11 chars) + '+' = 14 chars → strip the '0' trunk digit
      if (s.startsWith('+200') && s.length == 14) return '+20${s.substring(4)}';
      return s;
    }
    if (s.startsWith('20') && s.length == 12) return '+$s';
    if (s.startsWith('01') && s.length == 11) return '+20${s.substring(1)}';
    if (s.startsWith('1')  && s.length == 10) return '+20$s';
    return s;
  }
}
