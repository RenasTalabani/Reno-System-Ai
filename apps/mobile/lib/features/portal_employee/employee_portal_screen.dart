import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _employeePortalProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch<Map<String, dynamic>>(key: 'employee_portal_dashboard', fetch: () async {
    final r = await client.get('/v1/portal/employee/dashboard');
    return (r.data as Map<String, dynamic>?) ?? {};
  }) ?? {};
});

class EmployeePortalScreen extends ConsumerWidget {
  const EmployeePortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(_employeePortalProvider);

    return Scaffold(
      appBar: const RenoAppBar(title: 'Employee Portal'),
      body: state.when(
        loading: () => const LoadingWidget(),
        error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_employeePortalProvider)),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(_employeePortalProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _ProfileCard(data: data),
              const SizedBox(height: 20),
              _PortalMenuGrid(),
              const SizedBox(height: 20),
              _LeaveBalanceCard(data: data),
              const SizedBox(height: 20),
              _UpcomingSection(data: data),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ProfileCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: Colors.white.withOpacity(0.2),
          child: const Icon(Icons.person, color: Colors.white, size: 28),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${data['employee']?['name'] ?? 'Employee'}',
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          Text('${data['employee']?['position'] ?? ''}',
              style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
          Text('${data['employee']?['department'] ?? ''}',
              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
        ])),
      ]),
    );
  }
}

class _PortalMenuGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final items = [
      {'label': 'Leave Requests', 'icon': Icons.event_available_outlined, 'route': '/dashboard/portal/employee/leave', 'color': 0xFF6366F1},
      {'label': 'Attendance', 'icon': Icons.fingerprint, 'route': '/dashboard/portal/employee/attendance', 'color': 0xFF8B5CF6},
      {'label': 'Payslips', 'icon': Icons.receipt_outlined, 'route': null, 'color': 0xFF06B6D4},
      {'label': 'My Tasks', 'icon': Icons.task_outlined, 'route': null, 'color': 0xFF10B981},
      {'label': 'Documents', 'icon': Icons.folder_outlined, 'route': '/dashboard/documents', 'color': 0xFFF59E0B},
      {'label': 'Directory', 'icon': Icons.people_outlined, 'route': null, 'color': 0xFFEF4444},
    ];

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.1,
      children: items.map((item) {
        final color = Color(item['color'] as int);
        return InkWell(
          onTap: item['route'] != null ? () => context.go(item['route'] as String) : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
            ),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                child: Icon(item['icon'] as IconData, color: color, size: 24),
              ),
              const SizedBox(height: 8),
              Text(item['label'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
            ]),
          ),
        );
      }).toList(),
    );
  }
}

class _LeaveBalanceCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const _LeaveBalanceCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final balances = (data['leaveBalance'] as List? ?? []).take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Leave Balance', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      Row(children: balances.isEmpty
          ? [const Expanded(child: EmptyWidget(message: 'No leave data'))]
          : balances.map<Widget>((b) => Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8)],
                ),
                child: Column(children: [
                  Text('${b['remaining'] ?? 0}',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
                  Text('${b['type'] ?? ''}', style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
                ]),
              ),
            )).toList()),
    ]);
  }
}

class _UpcomingSection extends StatelessWidget {
  final Map<String, dynamic> data;
  const _UpcomingSection({required this.data});

  @override
  Widget build(BuildContext context) {
    final items = (data['upcomingLeaves'] as List? ?? []).take(3).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        const Text('Upcoming Leave', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        TextButton(
          onPressed: () => context.go('/dashboard/portal/employee/leave'),
          child: const Text('See All', style: TextStyle(fontSize: 12)),
        ),
      ]),
      if (items.isEmpty)
        const EmptyWidget(message: 'No upcoming leave', icon: Icons.event_available_outlined)
      else
        ...items.map((item) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.calendar_today_outlined, size: 20),
            title: Text('${item['leaveType'] ?? ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            subtitle: Text('${item['startDate'] ?? ''} – ${item['endDate'] ?? ''}', style: const TextStyle(fontSize: 12)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: _statusColor(item['status'] ?? '').withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('${item['status'] ?? ''}',
                  style: TextStyle(fontSize: 10, color: _statusColor(item['status'] ?? ''), fontWeight: FontWeight.w600)),
            ),
          ),
        )),
    ]);
  }

  Color _statusColor(String s) {
    if (s == 'approved') return Colors.green;
    if (s == 'pending') return Colors.orange;
    if (s == 'rejected') return Colors.red;
    return Colors.grey;
  }
}
