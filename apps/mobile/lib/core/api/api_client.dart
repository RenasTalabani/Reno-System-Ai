import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/token_storage.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return ApiClient(storage);
});

class ApiClient {
  late final Dio _dio;
  final TokenStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(_AuthInterceptor(_storage, _dio));
    _dio.interceptors.add(LogInterceptor(
      requestBody: false,
      responseBody: false,
      error: true,
    ));
  }

  void setBaseUrl(String baseUrl) {
    _dio.options.baseUrl = baseUrl;
  }

  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final res = await _dio.get(path, queryParameters: queryParameters);
      return ApiResponse.success(res.data, fromJson);
    } on DioException catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final res = await _dio.post(path, data: data);
      return ApiResponse.success(res.data, fromJson);
    } on DioException catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  Future<ApiResponse<T>> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final res = await _dio.put(path, data: data);
      return ApiResponse.success(res.data, fromJson);
    } on DioException catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  Future<ApiResponse<T>> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final res = await _dio.patch(path, data: data);
      return ApiResponse.success(res.data, fromJson);
    } on DioException catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  Future<ApiResponse<T>> delete<T>(String path) async {
    try {
      final res = await _dio.delete(path);
      return ApiResponse.success(res.data, null);
    } on DioException catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  String _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
        return 'Connection timed out. Check your internet.';
      case DioExceptionType.connectionError:
        return 'Cannot connect to server. Check your network.';
      case DioExceptionType.badResponse:
        final data = e.response?.data;
        if (data is Map && data['error'] != null) return data['error'].toString();
        return 'Server error (${e.response?.statusCode})';
      default:
        return e.message ?? 'Unknown error';
    }
  }
}

class _AuthInterceptor extends Interceptor {
  final TokenStorage _storage;
  final Dio _dio;

  _AuthInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Token expired — try refresh
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken != null) {
        try {
          final baseUrl = _dio.options.baseUrl;
          final res = await Dio().post('$baseUrl/v1/auth/refresh', data: {'refreshToken': refreshToken});
          if (res.data['success'] == true) {
            final newToken = res.data['data']['accessToken'];
            await _storage.saveTokens(accessToken: newToken, refreshToken: refreshToken);
            err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retried = await _dio.fetch(err.requestOptions);
            handler.resolve(retried);
            return;
          }
        } catch (_) {}
      }
      await _storage.clearTokens();
    }
    handler.next(err);
  }
}

class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool success;

  ApiResponse._({this.data, this.error, required this.success});

  factory ApiResponse.success(dynamic raw, T Function(dynamic)? fromJson) {
    if (raw is Map && raw['success'] == true) {
      final data = fromJson != null ? fromJson(raw['data']) : raw['data'] as T?;
      return ApiResponse._(data: data, success: true);
    }
    return ApiResponse._(error: (raw is Map ? raw['error'] : null) ?? 'Unknown error', success: false);
  }

  factory ApiResponse.error(String message) {
    return ApiResponse._(error: message, success: false);
  }
}
