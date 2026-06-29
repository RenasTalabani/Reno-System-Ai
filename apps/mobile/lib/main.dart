import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';
import 'core/notifications/push_service.dart';
import 'core/crash/crash_reporter.dart';

const _apiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://localhost:4000',
);

Future<void> main() async {
  // runZonedGuarded must wrap ensureInitialized AND runApp in the same zone
  runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      // Global Flutter error handler (UI thread errors)
      FlutterError.onError = (FlutterErrorDetails details) {
        FlutterError.presentError(details);
        CrashReporter.reportError(
          details.exception,
          details.stack,
          context: details.context?.toDescription() ?? 'flutter_framework',
          fatal: false,
        );
      };

      // Lock orientation to portrait on phones
      await SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);

      // Init offline cache
      await Hive.initFlutter();
      await Hive.openBox('cache');
      await Hive.openBox('settings');
      await Hive.openBox('messages');

      // Init local notifications
      await PushService.init();

      // Init crash reporter
      await CrashReporter.init(_apiBase);

      runApp(
        const ProviderScope(
          child: RenoApp(),
        ),
      );
    },
    (error, stack) {
      CrashReporter.reportError(
        error,
        stack,
        context: 'dart_zone',
        fatal: true,
      );
      if (kDebugMode) {
        // Re-throw in debug so the Flutter error overlay shows
        throw error;
      }
    },
  );
}
