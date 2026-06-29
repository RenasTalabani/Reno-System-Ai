import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _commDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch<Map<String, dynamic>>(key: 'comm_dashboard', fetch: () async {
    final r = await client.get('/v1/comm/dashboard');
    return (r.data as Map<String, dynamic>?) ?? {};
  }, ttlSeconds: 60) ?? {};
});

class CommInboxScreen extends ConsumerStatefulWidget {
  const CommInboxScreen({super.key});

  @override
  ConsumerState<CommInboxScreen> createState() => _CommInboxScreenState();
}

class _CommInboxScreenState extends ConsumerState<CommInboxScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RenoAppBar(title: 'Communication'),
      body: Column(children: [
        TabBar(
          controller: _tabs,
          tabs: const [Tab(text: 'Channels'), Tab(text: 'Direct'), Tab(text: 'Meetings')],
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        Expanded(child: TabBarView(controller: _tabs, children: [
          _ChannelsTab(),
          _DirectTab(),
          _MeetingsTab(),
        ])),
      ]),
    );
  }
}

class _ChannelsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_commDashboardProvider);
    return state.when(
      loading: () => const LoadingWidget(),
      error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_commDashboardProvider)),
      data: (data) {
        final channels = (data['myChannels'] as List? ?? []);
        if (channels.isEmpty) return const EmptyWidget(message: 'No channels yet', icon: Icons.tag);
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_commDashboardProvider),
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: channels.length,
            itemBuilder: (_, i) {
              final c = channels[i];
              final unread = c['unreadCount'] ?? 0;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  child: Text('#', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                ),
                title: Text('${c['name'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                subtitle: Text('${c['lastMessage'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                trailing: unread > 0
                    ? Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(10)),
                        child: Text('$unread', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      )
                    : null,
                onTap: () => context.go('/dashboard/comm/channel/${c['id']}'),
              );
            },
          ),
        );
      },
    );
  }
}

class _DirectTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final client = ref.read(apiClientProvider);
    return FutureBuilder<dynamic>(
      future: client.get('/v1/comm/dm'),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) return const LoadingWidget();
        if (snap.hasError) return ErrorWidget2(message: '${snap.error}');
        final dms = (snap.data?.data is List) ? snap.data!.data as List : [];
        if (dms.isEmpty) return const EmptyWidget(message: 'No direct messages', icon: Icons.person_outline);
        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: dms.length,
          itemBuilder: (_, i) {
            final dm = dms[i];
            return ListTile(
              leading: CircleAvatar(child: Text('${dm['name']?[0] ?? '?'}')),
              title: Text('${dm['name'] ?? 'Conversation'}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
              subtitle: Text('${dm['lastMessage'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
              onTap: () => context.go('/dashboard/comm/channel/${dm['id']}?type=dm'),
            );
          },
        );
      },
    );
  }
}

class _MeetingsTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_commDashboardProvider);
    return state.when(
      loading: () => const LoadingWidget(),
      error: (e, _) => ErrorWidget2(message: e.toString()),
      data: (data) {
        final meetings = (data['upcomingMeetings'] as List? ?? []);
        if (meetings.isEmpty) return const EmptyWidget(message: 'No upcoming meetings', icon: Icons.video_camera_front_outlined);
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: meetings.length,
          itemBuilder: (_, i) {
            final m = meetings[i];
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.video_camera_front_outlined, color: Theme.of(context).colorScheme.primary),
                ),
                title: Text('${m['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                subtitle: Text('${m['scheduledAt'] ?? ''}', style: const TextStyle(fontSize: 12)),
                trailing: StatusBadge(status: '${m['status'] ?? 'scheduled'}'),
              ),
            );
          },
        );
      },
    );
  }
}
