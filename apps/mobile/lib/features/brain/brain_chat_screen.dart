import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../shared/widgets/reno_app_bar.dart';

class _ChatMessage {
  final String role; // 'user' | 'assistant'
  final String content;
  final bool loading;
  _ChatMessage({required this.role, required this.content, this.loading = false});
}

class BrainChatScreen extends ConsumerStatefulWidget {
  const BrainChatScreen({super.key});

  @override
  ConsumerState<BrainChatScreen> createState() => _BrainChatScreenState();
}

class _BrainChatScreenState extends ConsumerState<BrainChatScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _messages.add(_ChatMessage(
      role: 'assistant',
      content: 'Hello! I\'m Reno Brain, your AI business assistant. I can help you with tickets, HR queries, data analysis, document search, and more. How can I help you today?',
    ));
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() {
      _messages.add(_ChatMessage(role: 'user', content: text));
      _messages.add(_ChatMessage(role: 'assistant', content: '', loading: true));
      _sending = true;
    });
    _msgCtrl.clear();
    _scrollToBottom();

    try {
      final client = ref.read(apiClientProvider);
      final r = await client.post('/v1/brain/chat', data: {
        'message': text,
      });
      final reply = r.data?['assistantMessage']?['content'] ??
          r.data?['reply'] ??
          r.data?['response'] ??
          'I couldn\'t process that. Please try again.';
      setState(() {
        _messages.removeLast();
        _messages.add(_ChatMessage(role: 'assistant', content: '$reply'));
      });
    } catch (e) {
      setState(() {
        _messages.removeLast();
        _messages.add(_ChatMessage(role: 'assistant', content: 'Sorry, I\'m having trouble connecting right now. Please try again.'));
      });
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: RenoAppBar(
        title: 'Reno Brain',
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => setState(() {
              _messages.clear();
              _messages.add(_ChatMessage(role: 'assistant', content: 'Chat cleared. How can I help you?'));
            }),
          ),
        ],
      ),
      body: Column(children: [
        // Context chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            _ContextChip(label: 'Open Tickets', onTap: () => _insertContext('Show my open tickets')),
            _ContextChip(label: 'Leave Balance', onTap: () => _insertContext('What is my leave balance?')),
            _ContextChip(label: 'Sales Summary', onTap: () => _insertContext('Give me a sales summary for this month')),
            _ContextChip(label: 'Analytics', onTap: () => _insertContext('Show analytics overview')),
          ]),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.builder(
            controller: _scrollCtrl,
            padding: const EdgeInsets.all(12),
            itemCount: _messages.length,
            itemBuilder: (_, i) => _BubbleRow(msg: _messages[i], userName: user?.fullName ?? 'You'),
          ),
        ),
        _InputBar(controller: _msgCtrl, sending: _sending, onSend: _send),
      ]),
    );
  }

  void _insertContext(String text) {
    _msgCtrl.text = text;
    _msgCtrl.selection = TextSelection.fromPosition(TextPosition(offset: text.length));
  }
}

class _ContextChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _ContextChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
        label: Text(label, style: const TextStyle(fontSize: 11)),
        onPressed: onTap,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.08),
      ),
    );
  }
}

class _BubbleRow extends StatelessWidget {
  final _ChatMessage msg;
  final String userName;
  const _BubbleRow({required this.msg, required this.userName});

  @override
  Widget build(BuildContext context) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(gradient: LinearGradient(colors: [Theme.of(context).colorScheme.primary, Theme.of(context).colorScheme.secondary]), shape: BoxShape.circle),
              child: const Icon(Icons.smart_toy, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isUser ? Theme.of(context).colorScheme.primary : Colors.grey[100],
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isUser ? 16 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 16),
              ),
            ),
            child: msg.loading
                ? Row(mainAxisSize: MainAxisSize.min, children: [
                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.grey[400], strokeWidth: 2)),
                    const SizedBox(width: 8),
                    Text('Thinking...', style: TextStyle(color: Colors.grey[500], fontSize: 13)),
                  ])
                : Text(msg.content, style: TextStyle(fontSize: 14, color: isUser ? Colors.white : Colors.black87)),
          )),
          if (isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  const _InputBar({required this.controller, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(left: 12, right: 8, top: 8, bottom: MediaQuery.of(context).viewInsets.bottom + 8),
      decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey[200]!))),
      child: Row(children: [
        Expanded(child: TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: 'Ask Reno Brain anything...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey[300]!)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            isDense: true,
          ),
          maxLines: null,
          onSubmitted: (_) => onSend(),
        )),
        const SizedBox(width: 4),
        sending
            ? Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle),
                child: const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
              )
            : FloatingActionButton.small(
                onPressed: onSend,
                child: const Icon(Icons.send, size: 18),
              ),
      ]),
    );
  }
}
