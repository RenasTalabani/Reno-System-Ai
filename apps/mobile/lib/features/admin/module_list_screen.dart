import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';
import 'module_config.dart';

final _moduleListProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, endpoint) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get(endpoint, queryParameters: {'limit': 50});
  final data = r.data;
  final list = (data is Map) ? data['data'] ?? data['items'] : data;
  if (list is! List) return [];
  return list.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
});

class ModuleListScreen extends ConsumerWidget {
  final ModuleConfig config;
  const ModuleListScreen({super.key, required this.config});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_moduleListProvider(config.endpoint));

    return Scaffold(
      appBar: RenoAppBar(title: config.title),
      body: state.when(
        loading: () => LoadingWidget(message: 'Loading ${config.title.toLowerCase()}...'),
        error: (e, _) => ErrorWidget2(
          message: e.toString(),
          onRetry: () => ref.invalidate(_moduleListProvider(config.endpoint)),
        ),
        data: (items) {
          if (items.isEmpty) {
            return EmptyWidget(message: 'No ${config.title.toLowerCase()} yet', icon: config.icon);
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(_moduleListProvider(config.endpoint)),
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _ModuleCard(config: config, item: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final ModuleConfig config;
  final Map<String, dynamic> item;
  const _ModuleCard({required this.config, required this.item});

  @override
  Widget build(BuildContext context) {
    final title = config.titleField(item);
    final subtitle = config.subtitleField(item);
    final status = config.statusField != null ? '${item[config.statusField] ?? ''}' : '';

    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        onTap: () => _showDetail(context, config, item),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(config.icon, color: Theme.of(context).colorScheme.primary, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: subtitle.isEmpty ? null : Text(subtitle, style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: status.isEmpty ? null : StatusBadge(status: status),
      ),
    );
  }

  void _showDetail(BuildContext context, ModuleConfig config, Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DetailSheet(config: config, item: item),
    );
  }
}

class _DetailSheet extends StatelessWidget {
  final ModuleConfig config;
  final Map<String, dynamic> item;
  const _DetailSheet({required this.config, required this.item});

  @override
  Widget build(BuildContext context) {
    // Show scalar fields only — nested objects/lists are summarized by count.
    final entries = item.entries.where((e) => e.key != 'id').toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(children: [
              Icon(config.icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(child: Text(config.titleField(item), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold))),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ]),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.separated(
              controller: scrollController,
              padding: const EdgeInsets.all(20),
              itemCount: entries.length,
              separatorBuilder: (_, __) => const Divider(height: 20),
              itemBuilder: (_, i) {
                final e = entries[i];
                final display = e.value is Map
                    ? '{${(e.value as Map).length} fields}'
                    : e.value is List
                        ? '${(e.value as List).length} items'
                        : '${e.value ?? '—'}';
                return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 130, child: Text(e.key, style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600))),
                  Expanded(child: Text(display, style: const TextStyle(fontSize: 13))),
                ]);
              },
            ),
          ),
        ]),
      ),
    );
  }
}
