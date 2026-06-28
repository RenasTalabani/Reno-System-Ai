import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';

class MobileSettingsScreen extends ConsumerStatefulWidget {
  const MobileSettingsScreen({super.key});

  @override
  ConsumerState<MobileSettingsScreen> createState() => _MobileSettingsScreenState();
}

class _MobileSettingsScreenState extends ConsumerState<MobileSettingsScreen> {
  bool _biometricEnabled = false;
  bool _pushEnabled = true;
  bool _offlineSyncEnabled = true;
  bool _loading = false;
  String? _status;
  bool _statusIsError = false;

  Future<void> _registerPushToken() async {
    setState(() { _loading = true; _status = null; });
    try {
      final client = ref.read(apiClientProvider);
      final fakeFcmToken = 'mock_fcm_token_${DateTime.now().millisecondsSinceEpoch}';
      final res = await client.post<dynamic>(
        '/v1/mobile/push-tokens',
        data: {
          'token': fakeFcmToken,
          'platform': Theme.of(context).platform == TargetPlatform.iOS ? 'ios' : 'android',
          'deviceName': 'My Device',
          'appVersion': '1.0.0',
        },
      );
      setState(() {
        _pushEnabled = res.success;
        _status = res.success ? 'Push notifications enabled' : res.error;
        _statusIsError = !res.success;
      });
    } catch (e) {
      setState(() { _status = e.toString(); _statusIsError = true; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _registerBiometric() async {
    setState(() { _loading = true; _status = null; });
    try {
      final client = ref.read(apiClientProvider);
      final res = await client.post<dynamic>(
        '/v1/mobile/biometric/register',
        data: {
          'deviceId': 'device_${DateTime.now().millisecondsSinceEpoch}',
          'publicKey': 'mock_public_key_base64',
          'keyAlgorithm': 'ES256',
        },
      );
      setState(() {
        _biometricEnabled = res.success;
        _status = res.success ? 'Biometric authentication enabled' : res.error;
        _statusIsError = !res.success;
      });
    } catch (e) {
      setState(() { _status = e.toString(); _statusIsError = true; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mobile Settings'),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _section(context, 'Push Notifications', [
            _settingRow(
              context: context,
              icon: Icons.notifications_outlined,
              title: 'Push Notifications',
              subtitle: 'Receive alerts on this device',
              value: _pushEnabled,
              onChanged: (v) => v ? _registerPushToken() : setState(() => _pushEnabled = false),
            ),
          ]),
          const SizedBox(height: 16),
          _section(context, 'Security', [
            _settingRow(
              context: context,
              icon: Icons.fingerprint,
              title: 'Biometric Login',
              subtitle: 'Use fingerprint or Face ID to unlock',
              value: _biometricEnabled,
              onChanged: (v) => v ? _registerBiometric() : setState(() => _biometricEnabled = false),
            ),
          ]),
          const SizedBox(height: 16),
          _section(context, 'Sync', [
            _settingRow(
              context: context,
              icon: Icons.sync,
              title: 'Offline Sync',
              subtitle: 'Queue actions when offline and sync later',
              value: _offlineSyncEnabled,
              onChanged: (v) => setState(() => _offlineSyncEnabled = v),
            ),
          ]),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 20),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (_status != null)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: (_statusIsError ? cs.error : cs.primary).withValues(alpha:0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  _status!,
                  style: TextStyle(color: _statusIsError ? cs.error : cs.primary, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _section(BuildContext context, String title, List<Widget> children) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: TextStyle(color: cs.onSurface.withValues(alpha:0.5), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.8),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: cs.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cs.outline.withValues(alpha:0.3)),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _settingRow({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(children: [
        Icon(icon, color: cs.primary, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(color: cs.onSurface, fontSize: 14, fontWeight: FontWeight.w500)),
          Text(subtitle, style: TextStyle(color: cs.onSurface.withValues(alpha:0.5), fontSize: 12)),
        ])),
        Switch(value: value, onChanged: onChanged),
      ]),
    );
  }
}
