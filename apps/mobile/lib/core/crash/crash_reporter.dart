import 'dart:async';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:dio/dio.dart';

/// Lightweight crash/error reporter — sends to Reno API.
/// Falls back to local Hive storage when offline.
class CrashReporter {
  static const _boxName = 'crash_reports';
  static const _maxLocalReports = 50;

  static final _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
    sendTimeout: const Duration(seconds: 5),
  ));

  static String? _apiBase;
  static Map<String, dynamic> _deviceInfo = {};
  static PackageInfo? _packageInfo;

  static Future<void> init(String apiBase) async {
    _apiBase = apiBase;
    await Hive.openBox<String>(_boxName);
    _deviceInfo = await _gatherDeviceInfo();
    _packageInfo = await PackageInfo.fromPlatform();
    await _flushLocalReports();
  }

  static Future<Map<String, dynamic>> _gatherDeviceInfo() async {
    final plugin = DeviceInfoPlugin();
    try {
      if (Platform.isAndroid) {
        final info = await plugin.androidInfo;
        return {
          'platform': 'android',
          'model': info.model,
          'manufacturer': info.manufacturer,
          'sdk': info.version.sdkInt,
          'release': info.version.release,
        };
      } else if (Platform.isIOS) {
        final info = await plugin.iosInfo;
        return {
          'platform': 'ios',
          'model': info.model,
          'systemVersion': info.systemVersion,
          'localizedModel': info.localizedModel,
        };
      }
    } catch (_) {}
    return {'platform': 'unknown'};
  }

  static Future<void> reportError(
    dynamic error,
    StackTrace? stack, {
    String? context,
    bool fatal = false,
  }) async {
    if (kDebugMode) {
      debugPrint('[CrashReporter] ${fatal ? 'FATAL' : 'ERROR'}: $error');
      if (stack != null) debugPrintStack(stackTrace: stack, maxFrames: 10);
    }

    final report = {
      'error': error.toString(),
      'stackTrace': stack?.toString() ?? '',
      'context': context ?? 'flutter_runtime',
      'fatal': fatal,
      'appVersion': _packageInfo?.version ?? 'unknown',
      'buildNumber': _packageInfo?.buildNumber ?? 'unknown',
      'device': _deviceInfo,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'source': 'mobile',
    };

    final sent = await _sendReport(report);
    if (!sent) {
      _storeLocalReport(report);
    }
  }

  static Future<bool> _sendReport(Map<String, dynamic> report) async {
    if (_apiBase == null) return false;
    try {
      await _dio.post(
        '$_apiBase/v1/monitoring/health/mobile-crash',
        data: report,
        options: Options(headers: {'Content-Type': 'application/json'}),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  static void _storeLocalReport(Map<String, dynamic> report) {
    try {
      final box = Hive.box<String>(_boxName);
      if (box.length >= _maxLocalReports) {
        box.deleteAt(0); // evict oldest
      }
      box.add(report.toString());
    } catch (_) {}
  }

  static Future<void> _flushLocalReports() async {
    if (_apiBase == null) return;
    try {
      final box = Hive.box<String>(_boxName);
      if (box.isEmpty) return;
      final keys = box.keys.toList();
      for (final key in keys) {
        await box.delete(key);
      }
    } catch (_) {}
  }
}
