import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _ticketsProvider = FutureProvider.family<List<dynamic>, String>((ref, status) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch<List<dynamic>>(key: 'tickets_$status', fetch: () async {
    final r = await client.get('/v1/helpdesk/tickets', queryParameters: {
      if (status != 'all') 'status': status,
      'limit': 50,
    });
    final d = r.data;
    return (d is List) ? d : (d is Map ? (d['data'] as List<dynamic>? ?? []) : []);
  }, ttlSeconds: 60) ?? [];
});

class TicketsScreen extends ConsumerStatefulWidget {
  const TicketsScreen({super.key});

  @override
  ConsumerState<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends ConsumerState<TicketsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _statusKeys = ['all', 'open', 'in_progress', 'resolved'];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _statusKeys.length, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: RenoAppBar(
        title: 'Tickets',
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showNewTicketSheet(),
        child: const Icon(Icons.add),
      ),
      body: Column(children: [
        TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [Tab(text: 'All'), Tab(text: 'Open'), Tab(text: 'In Progress'), Tab(text: 'Resolved')],
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
        Expanded(child: TabBarView(
          controller: _tabs,
          children: _statusKeys.map((s) => _TicketList(status: s)).toList(),
        )),
      ]),
    );
  }

  void _showNewTicketSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NewTicketSheet(onSubmit: (body) async {
        final client = ref.read(apiClientProvider);
        final r = await client.post('/v1/helpdesk/tickets', data: body);
        ref.invalidate(_ticketsProvider);
        if (mounted) {
          Navigator.pop(context);
          final id = r.data?['id'];
          if (id != null) context.go('/dashboard/tickets/$id');
        }
      }),
    );
  }
}

class _TicketList extends ConsumerWidget {
  final String status;
  const _TicketList({required this.status});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_ticketsProvider(status));
    return state.when(
      loading: () => const LoadingWidget(),
      error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_ticketsProvider(status))),
      data: (tickets) {
        if (tickets.isEmpty) return const EmptyWidget(message: 'No tickets found', icon: Icons.confirmation_number_outlined);
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_ticketsProvider(status)),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: tickets.length,
            itemBuilder: (_, i) => _TicketCard(ticket: tickets[i]),
          ),
        );
      },
    );
  }
}

class _TicketCard extends StatelessWidget {
  final dynamic ticket;
  const _TicketCard({required this.ticket});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: () => context.go('/dashboard/tickets/${ticket['id']}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('#${ticket['ticketNumber'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey, fontFamily: 'monospace')),
              const Spacer(),
              PriorityBadge(priority: '${ticket['priority'] ?? 'medium'}'),
              const SizedBox(width: 6),
              StatusBadge(status: '${ticket['status'] ?? 'open'}'),
            ]),
            const SizedBox(height: 6),
            Text('${ticket['subject'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
            if (ticket['description'] != null) ...[
              const SizedBox(height: 4),
              Text('${ticket['description']}', style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.schedule, size: 12, color: Colors.grey),
              const SizedBox(width: 4),
              Text('${ticket['createdAt'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              const Spacer(),
              if (ticket['assignedAgent'] != null)
                Row(children: [
                  const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('${ticket['assignedAgent']['name'] ?? ''}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ]),
            ]),
          ]),
        ),
      ),
    );
  }
}

class _NewTicketSheet extends StatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSubmit;
  const _NewTicketSheet({required this.onSubmit});

  @override
  State<_NewTicketSheet> createState() => _NewTicketSheetState();
}

class _NewTicketSheetState extends State<_NewTicketSheet> {
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _priority = 'medium';
  bool _loading = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('New Ticket', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
        ]),
        const SizedBox(height: 16),
        TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Subject')),
        const SizedBox(height: 12),
        TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description'), maxLines: 3),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _priority,
          decoration: const InputDecoration(labelText: 'Priority'),
          items: ['low', 'medium', 'high', 'critical'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
          onChanged: (v) => setState(() => _priority = v ?? 'medium'),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_loading || _subjectCtrl.text.isEmpty)
                ? null
                : () async {
                    setState(() => _loading = true);
                    await widget.onSubmit({'subject': _subjectCtrl.text, 'description': _descCtrl.text, 'priority': _priority, 'source': 'mobile'});
                    if (mounted) setState(() => _loading = false);
                  },
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Submit Ticket'),
          ),
        ),
      ]),
    );
  }
}
