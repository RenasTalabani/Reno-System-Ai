import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../shared/utils/time_ago.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _notificationsFilterProvider = StateProvider<bool>((ref) => false); // true = unread only

final _notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final unreadOnly = ref.watch(_notificationsFilterProvider);
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/notifications', queryParameters: {
    'limit': 50,
    if (unreadOnly) 'unread': 'true',
  });
  final d = r.data;
  return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_notificationsProvider);
    final unreadOnly = ref.watch(_notificationsFilterProvider);
    final unreadCount = state.value?.where((n) => n['readAt'] == null).length ?? 0;

    return Scaffold(
      appBar: RenoAppBar(
        title: 'Notifications',
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () async {
                final client = ref.read(apiClientProvider);
                await client.patch('/v1/notifications/read-all', data: {});
                ref.invalidate(_notificationsProvider);
              },
              child: const Text('Mark all read', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
      body: Column(children: [
        Row(children: [
          _FilterTab(
            label: 'All',
            selected: !unreadOnly,
            onTap: () => ref.read(_notificationsFilterProvider.notifier).state = false,
          ),
          _FilterTab(
            label: 'Unread',
            count: unreadOnly ? null : unreadCount,
            selected: unreadOnly,
            onTap: () => ref.read(_notificationsFilterProvider.notifier).state = true,
          ),
        ]),
        const Divider(height: 1),
        Expanded(
          child: state.when(
            loading: () => const LoadingWidget(),
            error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_notificationsProvider)),
            data: (notifications) {
              if (notifications.isEmpty) {
                return EmptyWidget(
                  message: unreadOnly ? 'No unread notifications' : "You're all caught up!",
                  icon: Icons.notifications_none_outlined,
                );
              }
              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(_notificationsProvider),
                child: ListView.separated(
                  itemCount: notifications.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, indent: 70),
                  itemBuilder: (_, i) => _NotificationTile(item: notifications[i], ref: ref),
                ),
              );
            },
          ),
        ),
      ]),
    );
  }
}

class _FilterTab extends StatelessWidget {
  final String label;
  final bool selected;
  final int? count;
  final VoidCallback onTap;
  const _FilterTab({required this.label, required this.selected, required this.onTap, this.count});

  @override
  Widget build(BuildContext context) {
    final color = selected ? Theme.of(context).colorScheme.primary : Colors.grey;
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent, width: 2)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color)),
          if (count != null && count! > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(10)),
              child: Text('$count', style: const TextStyle(fontSize: 10, color: Colors.white)),
            ),
          ],
        ]),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final dynamic item;
  final WidgetRef ref;
  const _NotificationTile({required this.item, required this.ref});

  IconData _icon() {
    switch ('${item['type']}') {
      case 'ticket': return Icons.confirmation_number_outlined;
      case 'message': return Icons.message_outlined;
      case 'meeting': return Icons.video_camera_front_outlined;
      case 'leave': return Icons.event_available_outlined;
      case 'mention': return Icons.alternate_email;
      default: return Icons.notifications_outlined;
    }
  }

  Color _color(BuildContext context) {
    switch ('${item['type']}') {
      case 'ticket': return const Color(0xFF6366F1);
      case 'message': return const Color(0xFF8B5CF6);
      case 'meeting': return const Color(0xFF06B6D4);
      case 'leave': return const Color(0xFF10B981);
      case 'mention': return const Color(0xFFF59E0B);
      default: return Theme.of(context).colorScheme.primary;
    }
  }

  String _channelLabel() {
    switch ('${item['channel']}') {
      case 'in_app': return 'In-App';
      case 'email': return 'Email';
      case 'push': return 'Push';
      default: return '${item['channel'] ?? 'In-App'}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRead = item['readAt'] != null;
    final color = _color(context);
    return InkWell(
      onTap: () async {
        if (!isRead) {
          final client = ref.read(apiClientProvider);
          await client.patch('/v1/notifications/${item['id']}/read', data: {});
          ref.invalidate(_notificationsProvider);
        }
      },
      child: Container(
        color: isRead ? null : color.withValues(alpha: 0.04),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(_icon(), color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text('${item['title'] ?? ''}', style: TextStyle(fontSize: 13, fontWeight: isRead ? FontWeight.normal : FontWeight.w600))),
              Text(formatRelative(item['createdAt']), style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ]),
            if (item['body'] != null) ...[
              const SizedBox(height: 2),
              Text('${item['body']}', style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 6),
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(4)),
                child: Text(_channelLabel(), style: const TextStyle(fontSize: 10, color: Colors.grey)),
              ),
              if (isRead) ...[
                const SizedBox(width: 8),
                const Text('Read', style: TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ]),
          ])),
          if (!isRead) ...[
            const SizedBox(width: 8),
            Container(width: 8, height: 8, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          ],
        ]),
      ),
    );
  }
}
