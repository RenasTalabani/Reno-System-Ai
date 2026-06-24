import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

final cacheServiceProvider = Provider<CacheService>((_) => CacheService());

class CacheService {
  static const _defaultTtlSeconds = 300; // 5 minutes

  Box get _box => Hive.box('cache');

  Future<void> set(String key, dynamic value, {int ttlSeconds = _defaultTtlSeconds}) async {
    final entry = {
      'data': value,
      'expiresAt': DateTime.now().add(Duration(seconds: ttlSeconds)).millisecondsSinceEpoch,
    };
    await _box.put(key, jsonEncode(entry));
  }

  T? get<T>(String key) {
    final raw = _box.get(key);
    if (raw == null) return null;
    try {
      final entry = jsonDecode(raw as String) as Map<String, dynamic>;
      final expiresAt = entry['expiresAt'] as int;
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        _box.delete(key);
        return null;
      }
      return entry['data'] as T?;
    } catch (_) {
      return null;
    }
  }

  Future<void> invalidate(String key) async {
    await _box.delete(key);
  }

  Future<void> invalidatePrefix(String prefix) async {
    final keys = _box.keys.where((k) => k.toString().startsWith(prefix)).toList();
    await _box.deleteAll(keys);
  }

  Future<void> clear() async {
    await _box.clear();
  }

  Future<T?> getOrFetch<T>({
    required String key,
    required Future<T?> Function() fetch,
    int ttlSeconds = _defaultTtlSeconds,
  }) async {
    final cached = get<T>(key);
    if (cached != null) return cached;

    final fresh = await fetch();
    if (fresh != null) await set(key, fresh, ttlSeconds: ttlSeconds);
    return fresh;
  }
}
