import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/cache/cache_service.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _attendanceSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final cache = ref.read(cacheServiceProvider);
  final client = ref.read(apiClientProvider);
  return await cache.getOrFetch<Map<String, dynamic>>(key: 'attendance_summary', fetch: () async {
    final r = await client.get('/v1/hr/attendance/my-summary');
    return (r.data as Map<String, dynamic>?) ?? {};
  }, ttlSeconds: 120) ?? {};
});

final _attendanceLogsProvider = FutureProvider<List<dynamic>>((ref) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/hr/attendance/my-logs', queryParameters: {'limit': 30});
  final d = r.data;
  return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
});

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  bool _checkingIn = false;
  String? _todayStatus;

  Future<void> _checkIn() async {
    setState(() => _checkingIn = true);
    final client = ref.read(apiClientProvider);
    try {
      await client.post('/v1/hr/attendance/check-in', data: {
        'source': 'mobile',
        'timestamp': DateTime.now().toIso8601String(),
      });
      setState(() => _todayStatus = 'checked_in');
      ref.invalidate(_attendanceSummaryProvider);
      ref.invalidate(_attendanceLogsProvider);
      if (mounted) _showSuccess('Checked in successfully!');
    } catch (e) {
      if (mounted) _showError('$e');
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  Future<void> _checkOut() async {
    setState(() => _checkingIn = true);
    final client = ref.read(apiClientProvider);
    try {
      await client.post('/v1/hr/attendance/check-out', data: {
        'source': 'mobile',
        'timestamp': DateTime.now().toIso8601String(),
      });
      setState(() => _todayStatus = 'checked_out');
      ref.invalidate(_attendanceSummaryProvider);
      ref.invalidate(_attendanceLogsProvider);
      if (mounted) _showSuccess('Checked out successfully!');
    } catch (e) {
      if (mounted) _showError('$e');
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.green));
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    final summaryState = ref.watch(_attendanceSummaryProvider);
    final logsState = ref.watch(_attendanceLogsProvider);

    return Scaffold(
      appBar: const RenoAppBar(title: 'Attendance'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ClockCard(
            status: _todayStatus,
            onCheckIn: _checkIn,
            onCheckOut: _checkOut,
            loading: _checkingIn,
          ),
          const SizedBox(height: 20),
          summaryState.when(
            loading: () => const LoadingWidget(),
            error: (e, _) => ErrorWidget2(message: e.toString()),
            data: (summary) => _SummaryRow(summary: summary),
          ),
          const SizedBox(height: 20),
          const Text('Recent Logs', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          logsState.when(
            loading: () => const LoadingWidget(),
            error: (e, _) => ErrorWidget2(message: e.toString()),
            data: (logs) => logs.isEmpty
                ? const EmptyWidget(message: 'No attendance logs', icon: Icons.access_time_outlined)
                : Column(children: logs.take(20).map<Widget>((l) => _LogRow(log: l)).toList()),
          ),
        ],
      ),
    );
  }
}

class _ClockCard extends StatelessWidget {
  final String? status;
  final VoidCallback onCheckIn;
  final VoidCallback onCheckOut;
  final bool loading;

  const _ClockCard({this.status, required this.onCheckIn, required this.onCheckOut, required this.loading});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final dateStr = '${now.day}/${now.month}/${now.year}';
    final isCheckedIn = status == 'checked_in';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isCheckedIn
              ? [const Color(0xFF10B981), const Color(0xFF059669)]
              : [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(children: [
        Text(timeStr, style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold, letterSpacing: -1)),
        Text(dateStr, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 14)),
        const SizedBox(height: 24),
        if (loading)
          const CircularProgressIndicator(color: Colors.white)
        else
          Row(children: [
            Expanded(child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.green),
              icon: const Icon(Icons.login, size: 18),
              label: const Text('Check In'),
              onPressed: status == 'checked_in' ? null : onCheckIn,
            )),
            const SizedBox(width: 12),
            Expanded(child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white.withOpacity(0.2), foregroundColor: Colors.white),
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Check Out'),
              onPressed: status != 'checked_in' ? null : onCheckOut,
            )),
          ]),
      ]),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final Map<String, dynamic> summary;
  const _SummaryRow({required this.summary});

  @override
  Widget build(BuildContext context) {
    final stats = [
      {'label': 'Present Days', 'value': '${summary['presentDays'] ?? 0}', 'color': 0xFF10B981},
      {'label': 'Absent Days', 'value': '${summary['absentDays'] ?? 0}', 'color': 0xFFEF4444},
      {'label': 'Late Days', 'value': '${summary['lateDays'] ?? 0}', 'color': 0xFFF59E0B},
    ];
    return Row(children: stats.map((s) => Expanded(child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Color(s['color'] as int).withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(children: [
        Text('${s['value']}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(s['color'] as int))),
        Text('${s['label']}', style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
      ]),
    ))).toList());
  }
}

class _LogRow extends StatelessWidget {
  final dynamic log;
  const _LogRow({required this.log});

  @override
  Widget build(BuildContext context) {
    final type = '${log['type'] ?? ''}';
    final isIn = type == 'check_in';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: isIn ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(isIn ? Icons.login : Icons.logout, size: 18, color: isIn ? Colors.green : Colors.red),
      ),
      title: Text(isIn ? 'Check In' : 'Check Out', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      subtitle: Text('${log['source'] ?? 'mobile'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
      trailing: Text('${log['timestamp'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
    );
  }
}
