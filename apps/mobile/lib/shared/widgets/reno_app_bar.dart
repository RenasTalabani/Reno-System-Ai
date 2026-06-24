import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/connectivity/connectivity_service.dart';

class RenoAppBar extends ConsumerWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool showOfflineBanner;

  const RenoAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.showOfflineBanner = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(isOnlineProvider);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppBar(
          title: Text(title),
          actions: actions,
          leading: leading,
        ),
        if (showOfflineBanner && !isOnline)
          Container(
            width: double.infinity,
            color: Colors.orange[700],
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: const Text(
              'No internet connection — showing cached data',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 11),
            ),
          ),
      ],
    );
  }
}
