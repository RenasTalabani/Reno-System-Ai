import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import 'token_storage.dart';

// Holds the current auth user data
class AuthUser {
  final String id;
  final String tenantId;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String role;

  AuthUser({
    required this.id,
    required this.tenantId,
    required this.email,
    this.firstName,
    this.lastName,
    this.displayName,
    required this.role,
  });

  String get fullName {
    if (firstName != null) return '$firstName ${lastName ?? ''}'.trim();
    return displayName ?? email;
  }

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        tenantId: json['tenantId'] as String,
        email: json['email'] as String,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        displayName: json['displayName'] as String?,
        role: json['role'] as String? ?? 'user',
      );
}

final authStateProvider = FutureProvider<AuthUser?>((ref) async {
  final storage = ref.watch(tokenStorageProvider);
  final token = await storage.getAccessToken();
  if (token == null) return null;

  final baseUrl = await storage.getBaseUrl();
  if (baseUrl == null) return null;

  final client = ref.watch(apiClientProvider);
  client.setBaseUrl(baseUrl);

  final res = await client.get<AuthUser>(
    '/v1/auth/me',
    fromJson: (json) => AuthUser.fromJson(json as Map<String, dynamic>),
  );

  if (res.success && res.data != null) return res.data;
  await storage.clearTokens();
  return null;
});

final authServiceProvider = Provider<AuthService>((ref) {
  final client = ref.watch(apiClientProvider);
  final storage = ref.watch(tokenStorageProvider);
  return AuthService(client, storage, ref);
});

class AuthService {
  final ApiClient _client;
  final TokenStorage _storage;
  final Ref _ref;

  AuthService(this._client, this._storage, this._ref);

  Future<String?> resolveTenant(String slugOrUrl) async {
    // If it looks like a URL already, use it directly
    String baseUrl;
    if (slugOrUrl.startsWith('http')) {
      baseUrl = slugOrUrl.trimRight().replaceAll(RegExp(r'/$'), '');
    } else {
      // Default: reno API on local/custom domain — for demo use localhost
      baseUrl = 'http://localhost:4000';
    }
    _client.setBaseUrl(baseUrl);

    // Verify the API is reachable
    final res = await _client.get('/v1/auth/health');
    if (!res.success && res.error?.contains('Server error') == false) {
      return 'Cannot reach server at $baseUrl';
    }

    await _storage.saveTenant(slug: slugOrUrl, baseUrl: baseUrl);
    return null; // null = success
  }

  Future<String?> login(String email, String password) async {
    final baseUrl = await _storage.getBaseUrl();
    if (baseUrl == null) return 'No server configured';
    _client.setBaseUrl(baseUrl);

    final res = await _client.post('/v1/auth/login', data: {
      'email': email,
      'password': password,
    });

    if (!res.success) return res.error ?? 'Login failed';

    final data = res.data as Map<String, dynamic>;
    final accessToken = data['data']?['accessToken'] as String?;
    final refreshToken = data['data']?['refreshToken'] as String?;
    final user = data['data']?['user'] as Map<String, dynamic>?;

    if (accessToken == null || user == null) return 'Invalid server response';

    await _storage.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken ?? '',
    );
    await _storage.saveUserInfo(
      userId: user['id'] as String,
      tenantId: user['tenantId'] as String,
    );

    _ref.invalidate(authStateProvider);
    return null;
  }

  Future<void> logout() async {
    await _client.post('/v1/auth/logout', data: {});
    await _storage.clearTokens();
    _ref.invalidate(authStateProvider);
  }
}
