import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/notifications', queryParameters: {'limit': 50});
  final d = r.data;
  return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_notificationsProvider);

    return Scaffold(
      appBar: RenoAppBar(
        title: 'Notifications',
        actions: [
          TextButton(
            onPressed: () async {
              final client = ref.read(apiClientProvider);
              await client.post('/v1/notifications/read-all', data: {});
              ref.invalidate(_notificationsProvider);
            },
            child: const Text('Mark all read', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
      body: state.when(
        loading: () => const LoadingWidget(),
        error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_notificationsProvider)),
        data: (notifications) {
          if (notifications.isEmpty) {
            return const EmptyWidget(
              message: 'You\'re all caught up!',
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

  @override
  Widget build(BuildContext context) {
    final isRead = item['isRead'] == true;
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
        color: isRead ? null : color.withOpacity(0.04),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
            child: Icon(_icon(), color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${item['title'] ?? ''}', style: TextStyle(fontSize: 13, fontWeight: isRead ? FontWeight.normal : FontWeight.w600)),
            if (item['body'] != null) ...[
              const SizedBox(height: 2),
              Text('${item['body']}', style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 4),
            Text('${item['createdAt'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ])),
          if (!isRead)
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        ]),
      ),
    );
  }
}
