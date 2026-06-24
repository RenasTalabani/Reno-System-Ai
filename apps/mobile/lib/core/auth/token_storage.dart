import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((_) => TokenStorage());

class TokenStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _keyAccess = 'reno_access_token';
  static const _keyRefresh = 'reno_refresh_token';
  static const _keyTenantSlug = 'reno_tenant_slug';
  static const _keyBaseUrl = 'reno_base_url';
  static const _keyUserId = 'reno_user_id';
  static const _keyTenantId = 'reno_tenant_id';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _keyAccess, value: accessToken),
      _storage.write(key: _keyRefresh, value: refreshToken),
    ]);
  }

  Future<void> saveUserInfo({
    required String userId,
    required String tenantId,
  }) async {
    await Future.wait([
      _storage.write(key: _keyUserId, value: userId),
      _storage.write(key: _keyTenantId, value: tenantId),
    ]);
  }

  Future<void> saveTenant({
    required String slug,
    required String baseUrl,
  }) async {
    await Future.wait([
      _storage.write(key: _keyTenantSlug, value: slug),
      _storage.write(key: _keyBaseUrl, value: baseUrl),
    ]);
  }

  Future<String?> getAccessToken() => _storage.read(key: _keyAccess);
  Future<String?> getRefreshToken() => _storage.read(key: _keyRefresh);
  Future<String?> getTenantSlug() => _storage.read(key: _keyTenantSlug);
  Future<String?> getBaseUrl() => _storage.read(key: _keyBaseUrl);
  Future<String?> getUserId() => _storage.read(key: _keyUserId);
  Future<String?> getTenantId() => _storage.read(key: _keyTenantId);

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _keyAccess),
      _storage.delete(key: _keyRefresh),
      _storage.delete(key: _keyUserId),
      _storage.delete(key: _keyTenantId),
    ]);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
