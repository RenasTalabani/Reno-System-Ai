import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_provider.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/reno_app_bar.dart';

final _channelMessagesProvider = FutureProvider.family<List<dynamic>, String>((ref, channelId) async {
  final client = ref.read(apiClientProvider);
  final r = await client.get('/v1/comm/channels/$channelId/messages', queryParameters: {'limit': 50});
  final d = r.data;
  return (d is List) ? d : (d is Map ? (d['data'] as List? ?? []) : []);
});

class ChannelScreen extends ConsumerStatefulWidget {
  final String channelId;
  const ChannelScreen({super.key, required this.channelId});

  @override
  ConsumerState<ChannelScreen> createState() => _ChannelScreenState();
}

class _ChannelScreenState extends ConsumerState<ChannelScreen> {
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending = false;

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    _msgCtrl.clear();
    final client = ref.read(apiClientProvider);
    await client.post('/v1/comm/channels/${widget.channelId}/messages', data: {
      'content': text,
      'type': 'text',
    });
    ref.invalidate(_channelMessagesProvider(widget.channelId));
    if (mounted) setState(() => _sending = false);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    });
  }

  Future<void> _addReaction(String messageId, String emoji) async {
    final client = ref.read(apiClientProvider);
    await client.post('/v1/comm/channels/$messageId/reactions', data: {'emoji': emoji});
    ref.invalidate(_channelMessagesProvider(widget.channelId));
  }

  @override
  Widget build(BuildContext context) {
    final messagesState = ref.watch(_channelMessagesProvider(widget.channelId));
    final user = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: RenoAppBar(
        title: '#channel',
        actions: [
          IconButton(icon: const Icon(Icons.people_outline), onPressed: () {}),
          IconButton(icon: const Icon(Icons.info_outline), onPressed: () {}),
        ],
      ),
      body: Column(children: [
        Expanded(child: messagesState.when(
          loading: () => const LoadingWidget(),
          error: (e, _) => ErrorWidget2(message: e.toString(), onRetry: () => ref.invalidate(_channelMessagesProvider(widget.channelId))),
          data: (messages) {
            if (messages.isEmpty) return const EmptyWidget(message: 'No messages yet. Say hello!', icon: Icons.chat_bubble_outline);
            return ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(8),
              itemCount: messages.length,
              itemBuilder: (_, i) => _MessageBubble(
                message: messages[i],
                isMe: messages[i]['userId'] == user?.id,
                onReact: (emoji) => _addReaction('${messages[i]['id']}', emoji),
              ),
            );
          },
        )),
        _MessageInput(controller: _msgCtrl, sending: _sending, onSend: _send),
      ]),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final dynamic message;
  final bool isMe;
  final void Function(String) onReact;

  const _MessageBubble({required this.message, required this.isMe, required this.onReact});

  @override
  Widget build(BuildContext context) {
    final reactions = (message['reactions'] as List? ?? []);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isMe) ...[
            CircleAvatar(radius: 16, child: Text('${message['user']?['name']?[0] ?? '?'}')),
            const SizedBox(width: 8),
          ],
          Flexible(child: Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMe)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text('${message['user']?['name'] ?? ''}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ),
              GestureDetector(
                onLongPress: () => _showReactionPicker(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isMe ? Theme.of(context).colorScheme.primary : Colors.grey[100],
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                  ),
                  child: Text(
                    '${message['content'] ?? ''}',
                    style: TextStyle(fontSize: 14, color: isMe ? Colors.white : Colors.black87),
                  ),
                ),
              ),
              if (reactions.isNotEmpty)
                Wrap(
                  spacing: 4,
                  children: reactions.map<Widget>((r) => GestureDetector(
                    onTap: () => onReact('${r['emoji']}'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey[300]!)),
                      child: Text('${r['emoji']} ${r['count'] ?? 1}', style: const TextStyle(fontSize: 12)),
                    ),
                  )).toList(),
                ),
              Text('${message['createdAt'] ?? ''}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          )),
          if (isMe) const SizedBox(width: 8),
        ],
      ),
    );
  }

  void _showReactionPicker(BuildContext context) {
    final emojis = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
    showModalBottomSheet(
      context: context,
      builder: (_) => Container(
        padding: const EdgeInsets.all(20),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: emojis.map((e) => GestureDetector(
          onTap: () { Navigator.pop(context); onReact(e); },
          child: Text(e, style: const TextStyle(fontSize: 28)),
        )).toList()),
      ),
    );
  }
}

class _MessageInput extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  const _MessageInput({required this.controller, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(left: 12, right: 8, top: 8, bottom: MediaQuery.of(context).viewInsets.bottom + 8),
      decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey[200]!))),
      child: Row(children: [
        IconButton(icon: const Icon(Icons.attach_file, size: 20), onPressed: () {}),
        Expanded(child: TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: 'Message...',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: Colors.grey[300]!)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            isDense: true,
          ),
          maxLines: null,
          onSubmitted: (_) => onSend(),
        )),
        const SizedBox(width: 4),
        sending
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : IconButton(icon: Icon(Icons.send, color: Theme.of(context).colorScheme.primary), onPressed: onSend),
      ]),
    );
  }
}
