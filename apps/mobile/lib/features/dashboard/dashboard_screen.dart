import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/cache/cache_service.dart';
import '../../core/theme/branding_provider.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch('dashboard_summary', () async {
    final r = await client.get('/v1/dashboard/summary');
    return r.data ?? {};
  });
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_dashboardProvider);
    final branding = ref.watch(brandingProvider);
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      appBar: RenoAppBar(
        title: branding.appName,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.go('/dashboard/notifications'),
          ),
        ],
      ),
      drawer: _buildDrawer(context, ref, auth.value),
      body: state.when(
        loading: () => const LoadingWidget(message: 'Loading dashboard...'),
        error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_dashboardProvider)),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _WelcomeCard(user: auth.value),
              const SizedBox(height: 16),
              _StatsRow(data: data),
              const SizedBox(height: 20),
              _SectionTitle('Quick Actions'),
              const SizedBox(height: 12),
              _QuickActions(),
              const SizedBox(height: 20),
              _SectionTitle('Recent Activity'),
              const SizedBox(height: 12),
              _RecentActivity(data: data),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, AuthUser? user) {
    final branding = ref.read(brandingProvider);
    return Drawer(
      child: SafeArea(
        child: Column(children: [
          DrawerHeader(
            decoration: BoxDecoration(color: Color(branding.primaryColor)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.business_rounded, color: Colors.white, size: 36),
                const SizedBox(height: 8),
                Text(branding.appName, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                Text(user?.email ?? '', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
              ],
            ),
          ),
          _DrawerTile(icon: Icons.dashboard_outlined, label: 'Dashboard', route: '/dashboard'),
          _DrawerTile(icon: Icons.person_outlined, label: 'Employee Portal', route: '/dashboard/portal/employee'),
          _DrawerTile(icon: Icons.support_agent_outlined, label: 'My Tickets', route: '/dashboard/tickets'),
          _DrawerTile(icon: Icons.message_outlined, label: 'Communication', route: '/dashboard/comm'),
          _DrawerTile(icon: Icons.description_outlined, label: 'Documents', route: '/dashboard/documents'),
          _DrawerTile(icon: Icons.smart_toy_outlined, label: 'Reno Brain', route: '/dashboard/brain'),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign Out'),
            onTap: () async {
              await ref.read(authServiceProvider).logout();
              if (context.mounted) context.go('/auth/login');
            },
          ),
        ]),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;

  const _DrawerTile({required this.icon, required this.label, required this.route});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, size: 22),
      title: Text(label, style: const TextStyle(fontSize: 14)),
      onTap: () {
        Navigator.pop(context);
        context.go(route);
      },
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  final AuthUser? user;
  const _WelcomeCard({this.user});

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$greeting,', style: const TextStyle(color: Colors.white, fontSize: 14)),
        Text(user?.name ?? 'User', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Text(user?.role ?? '', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
      ]),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final Map<String, dynamic> data;
  const _StatsRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final stats = [
      {'label': 'Open Tickets', 'value': '${data['openTickets'] ?? 0}', 'icon': Icons.confirmation_number_outlined, 'color': 0xFF6366F1},
      {'label': 'Unread Messages', 'value': '${data['unreadMessages'] ?? 0}', 'icon': Icons.message_outlined, 'color': 0xFF8B5CF6},
      {'label': 'Leave Days Left', 'value': '${data['leaveDaysLeft'] ?? 0}', 'icon': Icons.beach_access_outlined, 'color': 0xFF06B6D4},
    ];
    return Row(
      children: stats.map((s) => Expanded(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
          ),
          child: Column(children: [
            Icon(s['icon'] as IconData, color: Color(s['color'] as int), size: 24),
            const SizedBox(height: 6),
            Text(s['value'] as String, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(s['label'] as String, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
          ]),
        ),
      )).toList(),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600));
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final actions = [
      {'label': 'New Ticket', 'icon': Icons.add_circle_outline, 'route': '/dashboard/tickets'},
      {'label': 'Leave Request', 'icon': Icons.event_available_outlined, 'route': '/dashboard/portal/employee/leave'},
      {'label': 'Scan Code', 'icon': Icons.qr_code_scanner, 'route': '/dashboard/scanner'},
      {'label': 'Ask Brain', 'icon': Icons.smart_toy_outlined, 'route': '/dashboard/brain'},
    ];
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      children: actions.map((a) => InkWell(
        onTap: () => context.go(a['route'] as String),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(a['icon'] as IconData, color: Theme.of(context).colorScheme.primary, size: 26),
            const SizedBox(height: 4),
            Text(a['label'] as String, style: const TextStyle(fontSize: 9), textAlign: TextAlign.center),
          ]),
        ),
      )).toList(),
    );
  }
}

class _RecentActivity extends StatelessWidget {
  final Map<String, dynamic> data;
  const _RecentActivity({required this.data});

  @override
  Widget build(BuildContext context) {
    final items = (data['recentActivity'] as List? ?? []).take(5).toList();
    if (items.isEmpty) return const EmptyWidget(message: 'No recent activity', icon: Icons.history);

    return Column(
      children: items.map<Widget>((item) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
          child: Icon(Icons.notifications_outlined, size: 18, color: Theme.of(context).colorScheme.primary),
        ),
        title: Text('${item['description'] ?? ''}', style: const TextStyle(fontSize: 13)),
        subtitle: Text('${item['createdAt'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
      )).toList(),
    );
  }
}
