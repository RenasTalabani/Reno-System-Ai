import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/auth/auth_provider.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/branding_provider.dart';
import 'features/splash/splash_screen.dart';
import 'features/auth/tenant_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/portal_employee/employee_portal_screen.dart';
import 'features/portal_employee/leave_request_screen.dart';
import 'features/portal_customer/customer_portal_screen.dart';
import 'features/helpdesk/tickets_screen.dart';
import 'features/helpdesk/ticket_detail_screen.dart';
import 'features/comm/comm_inbox_screen.dart';
import 'features/comm/channel_screen.dart';
import 'features/brain/brain_chat_screen.dart';
import 'features/documents/documents_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/scanner/barcode_scanner_screen.dart';
import 'features/attendance/attendance_screen.dart';

final _routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = authState.value != null;
      final isSplash = state.matchedLocation == '/splash';
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (isSplash) return null;
      if (!isAuth && !isAuthRoute) return '/auth/tenant';
      if (isAuth && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/auth/tenant', builder: (_, __) => const TenantScreen()),
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/dashboard',
        builder: (_, __) => const DashboardScreen(),
        routes: [
          GoRoute(
            path: 'portal/employee',
            builder: (_, __) => const EmployeePortalScreen(),
            routes: [
              GoRoute(path: 'leave', builder: (_, __) => const LeaveRequestScreen()),
              GoRoute(path: 'attendance', builder: (_, __) => const AttendanceScreen()),
            ],
          ),
          GoRoute(path: 'portal/customer', builder: (_, __) => const CustomerPortalScreen()),
          GoRoute(
            path: 'tickets',
            builder: (_, __) => const TicketsScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (_, state) => TicketDetailScreen(ticketId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: 'comm',
            builder: (_, __) => const CommInboxScreen(),
            routes: [
              GoRoute(
                path: 'channel/:id',
                builder: (_, state) => ChannelScreen(channelId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: 'brain', builder: (_, __) => const BrainChatScreen()),
          GoRoute(path: 'documents', builder: (_, __) => const DocumentsScreen()),
          GoRoute(path: 'notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: 'scanner', builder: (_, __) => const BarcodeScannerScreen()),
        ],
      ),
    ],
  );
});

class RenoApp extends ConsumerWidget {
  const RenoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);
    final branding = ref.watch(brandingProvider);

    return MaterialApp.router(
      title: branding.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(branding),
      darkTheme: AppTheme.dark(branding),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
