import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((results) {
    return results.any((r) => r != ConnectivityResult.none);
  });
});

final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).when(
    data: (isOnline) => isOnline,
    loading: () => true,
    error: (_, __) => true,
  );
});
