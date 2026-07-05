// Formats an ISO timestamp as a short relative string ("2h ago"), matching
// the web dashboard's formatRelative() so both surfaces read the same way.
String formatRelative(dynamic isoTimestamp) {
  if (isoTimestamp == null) return '';
  final date = DateTime.tryParse('$isoTimestamp');
  if (date == null) return '$isoTimestamp';

  final diff = DateTime.now().toUtc().difference(date.toUtc());
  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';

  final weeks = diff.inDays ~/ 7;
  if (weeks < 5) return '${weeks}w ago';

  final local = date.toLocal();
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}
