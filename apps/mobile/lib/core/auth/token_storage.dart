import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());

class TokenStorage {
  static const _keyAccess = 'reno_access_token';
  static const _keyRefresh = 'reno_refresh_token';
  static const _keyTenantSlug = 'reno_tenant_slug';
  static const _keyBaseUrl = 'reno_base_url';
  static const _keyUserId = 'reno_user_id';
  static const _keyTenantId = 'reno_tenant_id';

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await _prefs;
    await prefs.setString(_keyAccess, accessToken);
    await prefs.setString(_keyRefresh, refreshToken);
  }

  Future<void> saveUserInfo({
    required String userId,
    required String tenantId,
  }) async {
    final prefs = await _prefs;
    await prefs.setString(_keyUserId, userId);
    await prefs.setString(_keyTenantId, tenantId);
  }

  Future<void> saveTenant({
    required String slug,
    required String baseUrl,
  }) async {
    final prefs = await _prefs;
    await prefs.setString(_keyTenantSlug, slug);
    await prefs.setString(_keyBaseUrl, baseUrl);
  }

  Future<String?> getAccessToken() async => (await _prefs).getString(_keyAccess);
  Future<String?> getRefreshToken() async => (await _prefs).getString(_keyRefresh);
  Future<String?> getTenantSlug() async => (await _prefs).getString(_keyTenantSlug);
  Future<String?> getBaseUrl() async => (await _prefs).getString(_keyBaseUrl);
  Future<String?> getUserId() async => (await _prefs).getString(_keyUserId);
  Future<String?> getTenantId() async => (await _prefs).getString(_keyTenantId);

  Future<void> clearTokens() async {
    final prefs = await _prefs;
    await prefs.remove(_keyAccess);
    await prefs.remove(_keyRefresh);
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyTenantId);
  }

  Future<void> clearAll() async {
    final prefs = await _prefs;
    await prefs.remove(_keyAccess);
    await prefs.remove(_keyRefresh);
    await prefs.remove(_keyTenantSlug);
    await prefs.remove(_keyBaseUrl);
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyTenantId);
  }
}
