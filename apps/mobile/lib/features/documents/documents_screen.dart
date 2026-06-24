import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _documentsProvider = FutureProvider.family<List<dynamic>, String>((ref, query) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  if (query.isEmpty) {
    return await cache.getOrFetch('documents_recent', () async {
      final r = await client.get('/v1/documents/articles', queryParameters: {'limit': 30, 'status': 'published'});
      final d = r.data;
      return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
    });
  } else {
    final r = await client.get('/v1/documents/search', queryParameters: {'q': query, 'limit': 20});
    final d = r.data;
    return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
  }
});

class DocumentsScreen extends ConsumerStatefulWidget {
  const DocumentsScreen({super.key});

  @override
  ConsumerState<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends ConsumerState<DocumentsScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(_documentsProvider(_query));

    return Scaffold(
      appBar: const RenoAppBar(title: 'Documents'),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _searchCtrl,
            decoration: InputDecoration(
              hintText: 'Search documents...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _query.isNotEmpty
                  ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _searchCtrl.clear(); setState(() => _query = ''); })
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _query = v.trim()),
          ),
        ),
        Expanded(child: state.when(
          loading: () => const LoadingWidget(message: 'Loading documents...'),
          error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_documentsProvider(_query))),
          data: (docs) {
            if (docs.isEmpty) return const EmptyWidget(message: 'No documents found', icon: Icons.description_outlined);
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(_documentsProvider(_query)),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: docs.length,
                itemBuilder: (_, i) => _DocumentCard(doc: docs[i]),
              ),
            );
          },
        )),
      ]),
    );
  }
}

class _DocumentCard extends StatelessWidget {
  final dynamic doc;
  const _DocumentCard({required this.doc});

  IconData _iconForType(String type) {
    switch (type) {
      case 'guide': return Icons.menu_book_outlined;
      case 'faq': return Icons.help_outline;
      case 'policy': return Icons.policy_outlined;
      case 'procedure': return Icons.checklist_outlined;
      default: return Icons.description_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = '${doc['type'] ?? 'article'}';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _openDoc(context),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_iconForType(type), color: Theme.of(context).colorScheme.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${doc['title'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 4),
              Row(children: [
                if (doc['category'] != null) ...[
                  Text('${doc['category']['name']}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  const Text(' · ', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
                Text('${doc['viewCount'] ?? 0} views', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ]),
            ])),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 20),
          ]),
        ),
      ),
    );
  }

  void _openDoc(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DocumentViewer(doc: doc),
    );
  }
}

class _DocumentViewer extends StatelessWidget {
  final dynamic doc;
  const _DocumentViewer({required this.doc});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, ctrl) => Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        child: Column(children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.symmetric(vertical: 12), decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(children: [
              Expanded(child: Text('${doc['title'] ?? ''}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ]),
          ),
          const Divider(),
          Expanded(child: ListView(controller: ctrl, padding: const EdgeInsets.all(20), children: [
            if (doc['excerpt'] != null) ...[
              Text('${doc['excerpt']}', style: const TextStyle(color: Colors.grey, fontSize: 13, fontStyle: FontStyle.italic)),
              const SizedBox(height: 16),
            ],
            Text('${doc['content'] ?? 'No content available.'}', style: const TextStyle(fontSize: 14, height: 1.6)),
            const SizedBox(height: 20),
            Row(children: [
              const Icon(Icons.visibility_outlined, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text('${doc['viewCount'] ?? 0} views', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const Spacer(),
              Text('${doc['updatedAt'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ]),
          ])),
        ]),
      ),
    );
  }
}
