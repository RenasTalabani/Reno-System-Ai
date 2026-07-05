import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _leaveRequestsProvider = FutureProvider<List<dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  final data = await cache.getOrFetch(key: 'my_leave_requests', fetch: () async {
    final r = await client.get('/v1/portal/employee/leave');
    return r.data;
  });
  final requests = (data is Map) ? data['requests'] : null;
  return requests is List ? requests : [];
});

final _leaveTypesProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/hr/leave/types');
  final d = r.data;
  return (d is List) ? d : [];
});

class LeaveRequestScreen extends ConsumerStatefulWidget {
  const LeaveRequestScreen({super.key});

  @override
  ConsumerState<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends ConsumerState<LeaveRequestScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
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
        title: 'Leave Requests',
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showNewRequestSheet(context),
          ),
        ],
      ),
      body: Column(children: [
        TabBar(
          controller: _tabs,
          tabs: const [Tab(text: 'My Requests'), Tab(text: 'Calendar')],
          labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        Expanded(child: TabBarView(controller: _tabs, children: [
          _MyRequestsTab(onNew: () => _showNewRequestSheet(context)),
          const _CalendarTab(),
        ])),
      ]),
    );
  }

  void _showNewRequestSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NewLeaveSheet(onSubmit: (body) async {
        final client = ref.read(apiClientProvider);
        await client.post('/v1/portal/employee/leave', data: body);
        ref.invalidate(_leaveRequestsProvider);
        if (mounted) Navigator.pop(context);
      }),
    );
  }
}

class _MyRequestsTab extends ConsumerWidget {
  final VoidCallback onNew;
  const _MyRequestsTab({required this.onNew});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_leaveRequestsProvider);
    return state.when(
      loading: () => const LoadingWidget(),
      error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_leaveRequestsProvider)),
      data: (items) {
        if (items.isEmpty) return EmptyWidget(message: 'No leave requests yet', icon: Icons.event_available_outlined, actionLabel: 'New Request', onAction: onNew);
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(_leaveRequestsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (_, i) => _LeaveCard(item: items[i]),
          ),
        );
      },
    );
  }
}

class _LeaveCard extends StatelessWidget {
  final dynamic item;
  const _LeaveCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final status = '${item['status'] ?? 'pending'}';
    final color = status == 'approved' ? Colors.green : status == 'rejected' ? Colors.red : Colors.orange;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
          child: Icon(Icons.calendar_month_outlined, color: color, size: 20),
        ),
        title: Text('${item['leaveType']?['name'] ?? 'Leave'}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 2),
          Text('${item['startDate'] ?? ''} – ${item['endDate'] ?? ''}', style: const TextStyle(fontSize: 12)),
          if (item['reason'] != null) Text('${item['reason']}', style: const TextStyle(fontSize: 11, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
        ]),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
          child: Text(status, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }
}

class _CalendarTab extends StatelessWidget {
  const _CalendarTab();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.calendar_month_outlined, size: 48, color: Colors.grey),
        SizedBox(height: 12),
        Text('Calendar view coming soon', style: TextStyle(color: Colors.grey)),
      ]),
    );
  }
}

class _NewLeaveSheet extends ConsumerStatefulWidget {
  final Future<void> Function(Map<String, dynamic>) onSubmit;
  const _NewLeaveSheet({required this.onSubmit});

  @override
  ConsumerState<_NewLeaveSheet> createState() => _NewLeaveSheetState();
}

class _NewLeaveSheetState extends ConsumerState<_NewLeaveSheet> {
  String? _leaveTypeId;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonCtrl = TextEditingController();
  bool _loading = false;

  Future<void> _pick(bool isStart) async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 7)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (d != null) setState(() { if (isStart) _startDate = d; else _endDate = d; });
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final typesState = ref.watch(_leaveTypesProvider);
    final types = typesState.value ?? [];

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('New Leave Request', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
        ]),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: _leaveTypeId,
          decoration: const InputDecoration(labelText: 'Leave Type'),
          items: types.map<DropdownMenuItem<String>>((t) => DropdownMenuItem(
            value: '${t['id']}',
            child: Text('${t['name']}'),
          )).toList(),
          onChanged: (v) => setState(() => _leaveTypeId = v),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton.icon(
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(_startDate == null ? 'Start Date' : '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'),
            onPressed: () => _pick(true),
          )),
          const SizedBox(width: 12),
          Expanded(child: OutlinedButton.icon(
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(_endDate == null ? 'End Date' : '${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'),
            onPressed: () => _pick(false),
          )),
        ]),
        const SizedBox(height: 12),
        TextField(
          controller: _reasonCtrl,
          decoration: const InputDecoration(labelText: 'Reason (optional)'),
          maxLines: 2,
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (_loading || _leaveTypeId == null || _startDate == null || _endDate == null)
                ? null
                : () async {
                    setState(() => _loading = true);
                    await widget.onSubmit({
                      'leaveTypeId': _leaveTypeId,
                      'startDate': _startDate!.toIso8601String(),
                      'endDate': _endDate!.toIso8601String(),
                      'reason': _reasonCtrl.text.isEmpty ? null : _reasonCtrl.text,
                    });
                    if (mounted) setState(() => _loading = false);
                  },
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Submit Request'),
          ),
        ),
      ]),
    );
  }
}
