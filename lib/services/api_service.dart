import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

const String kApiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://wenzla-backend-production.up.railway.app',
);

/// Maximum number of attempts (1 original + 2 retries).
const int _kMaxAttempts = 3;

/// First retry delay — doubles on each subsequent attempt (1s → 2s → 4s).
const Duration _kRetryBase = Duration(seconds: 1);

/// Request timeout — generous for slow mobile connections and Railway cold-starts.
const Duration _kTimeout = Duration(seconds: 30);

class ApiService {
  final String? token;
  const ApiService({this.token});

  Map<String, String> _headers({bool auth = false}) {
    final h = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
    };
    if (auth && token != null) h['Authorization'] = 'Bearer $token';
    return h;
  }

  // ── Public methods (unchanged signature) ─────────────────────────────────────

  Future<dynamic> get(
    String path, {
    bool auth = false,
    String? traceLabel,
    void Function(int statusCode)? onStatusCode,
  }) =>
      _request(
          () => http.get(
                Uri.parse('$kApiUrl$path'),
                headers: _headers(auth: auth),
              ),
          traceLabel: traceLabel,
          onStatusCode: onStatusCode);

  Future<dynamic> post(String path, Map<String, dynamic> body,
          {bool auth = false, String? traceLabel, void Function(int statusCode)? onStatusCode}) =>
      _request(
          () => http.post(
                Uri.parse('$kApiUrl$path'),
                headers: _headers(auth: auth),
                body: jsonEncode(body),
              ),
          traceLabel: traceLabel,
          onStatusCode: onStatusCode);

  Future<dynamic> patch(String path, Map<String, dynamic> body,
          {bool auth = false, String? traceLabel, void Function(int statusCode)? onStatusCode}) =>
      _request(
          () => http.patch(
                Uri.parse('$kApiUrl$path'),
                headers: _headers(auth: auth),
                body: jsonEncode(body),
              ),
          traceLabel: traceLabel,
          onStatusCode: onStatusCode);

  Future<dynamic> postMultipart(
    String path, {
    required Map<String, String> fields,
    String? filePath,
    String fileField = 'image',
    bool auth = false,
  }) async {
    try {
      if (filePath != null && filePath.isNotEmpty) {
        final file = File(filePath);
        final exists = await file.exists();
        final size = exists ? await file.length() : -1;
        debugPrint('[API] multipart file path=$filePath exists=$exists size=$size');
      }
      final req = http.MultipartRequest('POST', Uri.parse('$kApiUrl$path'));
      req.headers['Accept'] = 'application/json';
      if (auth && token != null) {
        req.headers['Authorization'] = 'Bearer $token';
      }
      req.fields.addAll(fields);
      if (filePath != null && filePath.isNotEmpty) {
        req.files.add(await http.MultipartFile.fromPath(fileField, filePath));
      }
      final streamed = await req.send().timeout(_kTimeout);
      final res = await http.Response.fromStream(streamed);
      debugPrint('[API] MULTIPART ${res.statusCode} ${res.request?.url}: ${res.body}');
      return _parse(res);
    } on TimeoutException {
      _logError('MULTIPART TIMEOUT', 0);
      return null;
    } on HttpException catch (e) {
      _logError('MULTIPART HTTP: ${e.message}', 0);
      return null;
    } on SocketException catch (e) {
      _logError('MULTIPART SOCKET: ${e.message}', 0);
      return null;
    } on http.ClientException catch (e) {
      _logError('MULTIPART CLIENT: ${e.message}', 0);
      return null;
    } catch (e) {
      _logError('MULTIPART UNEXPECTED: $e', 0);
      return null;
    }
  }

  // ── Core request engine with retry ──────────────────────────────────────────

  /// Executes [call] with [_kTimeout], retrying on transient network errors
  /// (HttpException, SocketException, HandshakeException, TimeoutException).
  /// Returns parsed JSON on success, or `null` after all attempts fail.
  Future<dynamic> _request(
    Future<http.Response> Function() call, {
    int attempt = 0,
    String? traceLabel,
    void Function(int statusCode)? onStatusCode,
  }) async {
    try {
      if (traceLabel != null && attempt == 0) {
        debugPrint('[$traceLabel] API request started');
      }
      final res = await call().timeout(_kTimeout);
      onStatusCode?.call(res.statusCode);
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API response received');
        debugPrint('[$traceLabel] HTTP status code: ${res.statusCode}');
      }
      return _parse(res);
    } on TimeoutException {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: timeout');
      }
      _logError('TIMEOUT', attempt);
      return _retryOrNull(
        call,
        attempt,
        traceLabel: traceLabel,
        onStatusCode: onStatusCode,
      );
    } on HttpException catch (e) {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: HttpException ${e.message}');
      }
      // Covers "Connection closed while receiving data" and similar
      _logError('HTTP: ${e.message}', attempt);
      return _retryOrNull(
        call,
        attempt,
        traceLabel: traceLabel,
        onStatusCode: onStatusCode,
      );
    } on SocketException catch (e) {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: SocketException ${e.message}');
      }
      // No network, DNS failure, connection refused
      _logError('SOCKET: ${e.message}', attempt);
      return _retryOrNull(
        call,
        attempt,
        traceLabel: traceLabel,
        onStatusCode: onStatusCode,
      );
    } on HandshakeException catch (e) {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: HandshakeException ${e.message}');
      }
      // TLS/SSL failures
      _logError('TLS: ${e.message}', attempt);
      return _retryOrNull(
        call,
        attempt,
        traceLabel: traceLabel,
        onStatusCode: onStatusCode,
      );
    } on http.ClientException catch (e) {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: ClientException ${e.message}');
      }
      // http package wraps some OS-level errors here
      _logError('CLIENT: ${e.message}', attempt);
      return _retryOrNull(
        call,
        attempt,
        traceLabel: traceLabel,
        onStatusCode: onStatusCode,
      );
    } catch (e) {
      if (traceLabel != null) {
        debugPrint('[$traceLabel] API request failed: unexpected $e');
      }
      // Unexpected error (e.g. JSON parse failure) — do NOT retry
      _logError('UNEXPECTED: $e', attempt);
      return null;
    }
  }

  Future<dynamic> _retryOrNull(Future<http.Response> Function() call, int attempt,
      {String? traceLabel, void Function(int statusCode)? onStatusCode}) async {
    if (attempt >= _kMaxAttempts - 1) {
      debugPrint('[API] All $_kMaxAttempts attempts failed — returning null.');
      return null;
    }
    // Exponential backoff: 1s, 2s, (4s if maxAttempts ever raised)
    final delay = _kRetryBase * (1 << attempt);
    debugPrint('[API] Retrying in ${delay.inSeconds}s '
        '(attempt ${attempt + 2}/$_kMaxAttempts)…');
    await Future<void>.delayed(delay);
    return _request(
      call,
      attempt: attempt + 1,
      traceLabel: traceLabel,
      onStatusCode: onStatusCode,
    );
  }

  void _logError(String msg, int attempt) {
    debugPrint('[API] ⚠ $msg  (attempt ${attempt + 1}/$_kMaxAttempts)');
  }

  // ── Response parser ──────────────────────────────────────────────────────────

  dynamic _parse(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      debugPrint('[API] ${res.statusCode} ${res.request?.url}: ${res.body}');
    }
    try {
      return jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      return null;
    }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /// Normalise Egyptian phone number to +20XXXXXXXXXX
  static String normalisePhone(String raw) {
    var s = raw.trim();
    s = s.replaceAll(RegExp(r'[\s\-()]'), '');
    if (s.startsWith('+')) {
      if (s.startsWith('+200') && s.length == 14) return '+20${s.substring(4)}';
      return s;
    }
    if (s.startsWith('20') && s.length == 12) return '+$s';
    if (s.startsWith('01') && s.length == 11) return '+20${s.substring(1)}';
    if (s.startsWith('1') && s.length == 10) return '+20$s';
    return s;
  }

  /// Mask a phone number for safe logging/analytics/Crashlytics.
  /// +201553544111 → +201****111
  static String maskPhone(String phone) {
    if (phone.length < 7) return phone;
    return '${phone.substring(0, 4)}****${phone.substring(phone.length - 3)}';
  }
}
