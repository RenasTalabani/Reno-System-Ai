import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';
import '../../shared/widgets/loading_widget.dart' show StatusBadge;

final _customerPortalProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch('customer_portal_dashboard', () async {
    final r = await client.get('/v1/portal/customer/dashboard');
    return r.data ?? {};
  });
});

class CustomerPortalScreen extends ConsumerWidget {
  const CustomerPortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_customerPortalProvider);

    return Scaffold(
      appBar: const RenoAppBar(title: 'Customer Portal'),
      body: state.when(
        loading: () => const LoadingWidget(),
        error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_customerPortalProvider)),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_customerPortalProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _WelcomeBanner(data: data),
              const SizedBox(height: 20),
              _ActionGrid(),
              const SizedBox(height: 20),
              _RecentTicketsSection(data: data),
              const SizedBox(height: 20),
              _AnnouncementsSection(data: data),
            ],
          ),
        ),
      ),
    );
  }
}

class _WelcomeBanner extends StatelessWidget {
  final Map<String, dynamic> data;
  const _WelcomeBanner({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${data['customerName'] ?? 'Welcome'}',
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('Customer Portal', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${data['openTickets'] ?? 0}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
          Text('Open Tickets', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11)),
        ]),
      ]),
    );
  }
}

class _ActionGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final actions = [
      {'label': 'Submit Ticket', 'icon': Icons.add_circle_outlined, 'route': '/dashboard/tickets', 'color': 0xFF6366F1},
      {'label': 'My Tickets', 'icon': Icons.confirmation_number_outlined, 'route': '/dashboard/tickets', 'color': 0xFF8B5CF6},
      {'label': 'Knowledge Base', 'icon': Icons.menu_book_outlined, 'route': '/dashboard/documents', 'color': 0xFF06B6D4},
      {'label': 'Contact Us', 'icon': Icons.support_agent_outlined, 'route': null, 'color': 0xFF10B981},
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 2.5,
      children: actions.map((a) {
        final color = Color(a['color'] as int);
        return InkWell(
          onTap: a['route'] != null ? () => context.go(a['route'] as String) : null,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withOpacity(0.2)),
            ),
            child: Row(children: [
              Icon(a['icon'] as IconData, color: color, size: 22),
              const SizedBox(width: 8),
              Expanded(child: Text(a['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: color))),
            ]),
          ),
        );
      }).toList(),
    );
  }
}

class _RecentTicketsSection extends StatelessWidget {
  final Map<String, dynamic> data;
  const _RecentTicketsSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final tickets = (data['recentTickets'] as List? ?? []).take(5).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Recent Tickets', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        TextButton(onPressed: () => context.go('/dashboard/tickets'), child: const Text('All', style: TextStyle(fontSize: 12))),
      ]),
      const SizedBox(height: 8),
      if (tickets.isEmpty)
        const EmptyWidget(message: 'No tickets yet', icon: Icons.confirmation_number_outlined)
      else
        ...tickets.map((t) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text('${t['subject'] ?? ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text('#${t['ticketNumber'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            trailing: StatusBadge(status: '${t['status'] ?? 'open'}'),
            onTap: () => context.go('/dashboard/tickets/${t['id']}'),
          ),
        )),
    ]);
  }
}

class _AnnouncementsSection extends StatelessWidget {
  final Map<String, dynamic> data;
  const _AnnouncementsSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final items = (data['announcements'] as List? ?? []).take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Announcements', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      if (items.isEmpty)
        const EmptyWidget(message: 'No announcements', icon: Icons.campaign_outlined)
      else
        ...items.map((a) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.campaign_outlined, color: Color(0xFF6366F1)),
            title: Text('${a['title'] ?? ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            subtitle: Text('${a['publishedAt'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ),
        )),
    ]);
  }
}
