import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _ticketDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/helpdesk/tickets/$id');
  return r.data ?? {};
});

final _ticketCommentsProvider = FutureProvider.family<List<dynamic>, String>((ref, id) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/helpdesk/tickets/$id/comments');
  final d = r.data;
  return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
});

class TicketDetailScreen extends ConsumerStatefulWidget {
  final String ticketId;
  const TicketDetailScreen({super.key, required this.ticketId});

  @override
  ConsumerState<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends ConsumerState<TicketDetailScreen> {
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _addComment() async {
    if (_commentCtrl.text.trim().isEmpty) return;
    setState(() => _submitting = true);
    final client = ref.read(apiClientProvider);
    await client.post('/v1/helpdesk/tickets/${widget.ticketId}/comments', data: {
      'content': _commentCtrl.text.trim(),
      'isInternal': false,
    });
    _commentCtrl.clear();
    ref.invalidate(_ticketCommentsProvider(widget.ticketId));
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) {
    final ticketState = ref.watch(_ticketDetailProvider(widget.ticketId));
    final commentsState = ref.watch(_ticketCommentsProvider(widget.ticketId));

    return Scaffold(
      appBar: RenoAppBar(
        title: 'Ticket',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(_ticketDetailProvider(widget.ticketId));
              ref.invalidate(_ticketCommentsProvider(widget.ticketId));
            },
          ),
        ],
      ),
      body: ticketState.when(
        loading: () => const LoadingWidget(),
        error: (e, _) => ErrorWidget2(message: e.toString()),
        data: (ticket) => Column(children: [
          Expanded(child: ListView(padding: const EdgeInsets.all(16), children: [
            _TicketHeader(ticket: ticket),
            const SizedBox(height: 16),
            _TicketMeta(ticket: ticket),
            const SizedBox(height: 16),
            if ((ticket['description'] ?? '').isNotEmpty) ...[
              const Text('Description', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
              const SizedBox(height: 6),
              Text('${ticket['description']}', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 16),
            ],
            const Text('Comments', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 8),
            commentsState.when(
              loading: () => const LoadingWidget(),
              error: (e, _) => ErrorWidget2(message: e.toString()),
              data: (comments) => comments.isEmpty
                  ? const EmptyWidget(message: 'No comments yet', icon: Icons.chat_bubble_outline)
                  : Column(children: comments.map<Widget>((c) => _CommentBubble(comment: c)).toList()),
            ),
          ])),
          _CommentInput(controller: _commentCtrl, submitting: _submitting, onSend: _addComment),
        ]),
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  final Map<String, dynamic> ticket;
  const _TicketHeader({required this.ticket});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Text('#${ticket['ticketNumber'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'monospace')),
        const Spacer(),
        PriorityBadge(priority: '${ticket['priority'] ?? 'medium'}'),
        const SizedBox(width: 6),
        StatusBadge(status: '${ticket['status'] ?? 'open'}'),
      ]),
      const SizedBox(height: 6),
      Text('${ticket['subject'] ?? ''}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    ]);
  }
}

class _TicketMeta extends StatelessWidget {
  final Map<String, dynamic> ticket;
  const _TicketMeta({required this.ticket});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(10)),
      child: Column(children: [
        _MetaRow('Type', '${ticket['type'] ?? ''}'),
        _MetaRow('Category', '${ticket['category']?['name'] ?? 'Uncategorized'}'),
        _MetaRow('Agent', ticket['assignedAgent'] != null ? '${ticket['assignedAgent']['name']}' : 'Unassigned'),
        _MetaRow('Created', '${ticket['createdAt'] ?? ''}'),
      ]),
    );
  }
}

class _MetaRow extends StatelessWidget {
  final String label;
  final String value;
  const _MetaRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(children: [
        SizedBox(width: 80, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
      ]),
    );
  }
}

class _CommentBubble extends StatelessWidget {
  final dynamic comment;
  const _CommentBubble({required this.comment});

  @override
  Widget build(BuildContext context) {
    final isInternal = comment['isInternal'] == true;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(radius: 16, child: Text('${comment['author']?['name']?[0] ?? '?'}')),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('${comment['author']?['name'] ?? 'Unknown'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            if (isInternal) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: Colors.amber[100], borderRadius: BorderRadius.circular(10)),
                child: const Text('Internal', style: TextStyle(fontSize: 9, color: Colors.amber, fontWeight: FontWeight.w600)),
              ),
            ],
            const Spacer(),
            Text('${comment['createdAt'] ?? ''}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ]),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isInternal ? Colors.amber[50] : Colors.grey[100],
              borderRadius: const BorderRadius.only(topRight: Radius.circular(10), bottomLeft: Radius.circular(10), bottomRight: Radius.circular(10)),
            ),
            child: Text('${comment['content'] ?? ''}', style: const TextStyle(fontSize: 13)),
          ),
        ])),
      ]),
    );
  }
}

class _CommentInput extends StatelessWidget {
  final TextEditingController controller;
  final bool submitting;
  final VoidCallback onSend;

  const _CommentInput({required this.controller, required this.submitting, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(left: 12, right: 8, top: 8, bottom: MediaQuery.of(context).viewInsets.bottom + 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Row(children: [
        Expanded(child: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Add a comment...', border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
          maxLines: null,
        )),
        submitting
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : IconButton(icon: Icon(Icons.send, color: Theme.of(context).colorScheme.primary), onPressed: onSend),
      ]),
    );
  }
}
