import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api/api_client.dart';
import '../../shared/widgets/reno_app_bar.dart';

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final _cameraCtrl = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
  bool _scanned = false;
  String? _lastResult;
  bool _torch = false;

  @override
  void dispose() {
    _cameraCtrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_scanned) return;
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code == null) return;

    setState(() { _scanned = true; _lastResult = code; });

    // Look up item in inventory/assets
    final client = ref.read(apiClientProvider);
    try {
      final r = await client.get('/v1/inventory/items/by-barcode/$code');
      if (!mounted) return;
      _showResultSheet(context, code, r.data);
    } catch (_) {
      if (!mounted) return;
      _showResultSheet(context, code, null);
    }
  }

  void _showResultSheet(BuildContext context, String code, dynamic data) {
    showModalBottomSheet(
      context: context,
      builder: (_) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.qr_code_2, size: 28),
            const SizedBox(width: 10),
            const Text('Scan Result', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const Spacer(),
            IconButton(icon: const Icon(Icons.close), onPressed: () { Navigator.pop(context); setState(() => _scanned = false); }),
          ]),
          const SizedBox(height: 16),
          _InfoRow('Barcode', code),
          if (data != null) ...[
            _InfoRow('Item', '${data['name'] ?? ''}'),
            _InfoRow('SKU', '${data['sku'] ?? ''}'),
            _InfoRow('Category', '${data['category']?['name'] ?? ''}'),
            _InfoRow('Stock', '${data['stockQuantity'] ?? 0}'),
          ] else
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text('Item not found in inventory.', style: TextStyle(color: Colors.grey)),
            ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.qr_code_scanner, size: 18),
              label: const Text('Scan Again'),
              onPressed: () {
                Navigator.pop(context);
                setState(() => _scanned = false);
              },
            ),
          ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: RenoAppBar(
        title: 'Barcode Scanner',
        actions: [
          IconButton(
            icon: Icon(_torch ? Icons.flash_on : Icons.flash_off),
            onPressed: () { _cameraCtrl.toggleTorch(); setState(() => _torch = !_torch); },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios),
            onPressed: () => _cameraCtrl.switchCamera(),
          ),
        ],
      ),
      body: Stack(children: [
        MobileScanner(controller: _cameraCtrl, onDetect: _onDetect),
        // Scan overlay
        Center(child: Container(
          width: 240,
          height: 240,
          decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
            borderRadius: BorderRadius.circular(16),
          ),
        )),
        // Instruction text
        Positioned(
          bottom: 60,
          left: 0, right: 0,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 40),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: Colors.black.withOpacity(0.6), borderRadius: BorderRadius.circular(20)),
            child: const Text(
              'Align barcode within the frame',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
        ),
        if (_lastResult != null)
          Positioned(
            top: 16, left: 16, right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(color: Colors.black.withOpacity(0.7), borderRadius: BorderRadius.circular(10)),
              child: Text('Last: $_lastResult', style: const TextStyle(color: Colors.white, fontSize: 12), textAlign: TextAlign.center),
            ),
          ),
      ]),
    );
  }
}

extension IterableExt<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
