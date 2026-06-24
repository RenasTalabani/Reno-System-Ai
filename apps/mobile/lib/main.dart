import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'app.dart';
import 'core/notifications/push_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

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

  runApp(
    const ProviderScope(
      child: RenoApp(),
    ),
  );
}
