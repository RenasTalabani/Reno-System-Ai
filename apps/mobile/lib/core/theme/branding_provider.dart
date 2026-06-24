import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BrandingConfig {
  final String appName;
  final Color primaryColor;
  final Color accentColor;
  final String? logoUrl;
  final String? tenantName;

  const BrandingConfig({
    this.appName = 'Reno System',
    this.primaryColor = const Color(0xFF6366F1), // indigo-500
    this.accentColor = const Color(0xFF8B5CF6),  // violet-500
    this.logoUrl,
    this.tenantName,
  });

  BrandingConfig copyWith({
    String? appName,
    Color? primaryColor,
    Color? accentColor,
    String? logoUrl,
    String? tenantName,
  }) =>
      BrandingConfig(
        appName: appName ?? this.appName,
        primaryColor: primaryColor ?? this.primaryColor,
        accentColor: accentColor ?? this.accentColor,
        logoUrl: logoUrl ?? this.logoUrl,
        tenantName: tenantName ?? this.tenantName,
      );
}

class BrandingNotifier extends Notifier<BrandingConfig> {
  @override
  BrandingConfig build() => const BrandingConfig();

  Future<void> loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final primaryHex = prefs.getString('branding_primary');
    final accentHex = prefs.getString('branding_accent');
    final appName = prefs.getString('branding_app_name');
    final logoUrl = prefs.getString('branding_logo_url');
    final tenantName = prefs.getString('branding_tenant_name');

    state = BrandingConfig(
      appName: appName ?? 'Reno System',
      primaryColor: primaryHex != null ? Color(int.parse(primaryHex, radix: 16)) : const Color(0xFF6366F1),
      accentColor: accentHex != null ? Color(int.parse(accentHex, radix: 16)) : const Color(0xFF8B5CF6),
      logoUrl: logoUrl,
      tenantName: tenantName,
    );
  }

  Future<void> applyBranding({
    String? appName,
    String? primaryColorHex,
    String? accentColorHex,
    String? logoUrl,
    String? tenantName,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    if (appName != null) await prefs.setString('branding_app_name', appName);
    if (primaryColorHex != null) await prefs.setString('branding_primary', primaryColorHex);
    if (accentColorHex != null) await prefs.setString('branding_accent', accentColorHex);
    if (logoUrl != null) await prefs.setString('branding_logo_url', logoUrl);
    if (tenantName != null) await prefs.setString('branding_tenant_name', tenantName);

    state = state.copyWith(
      appName: appName,
      primaryColor: primaryColorHex != null ? Color(int.parse(primaryColorHex, radix: 16)) : null,
      accentColor: accentColorHex != null ? Color(int.parse(accentColorHex, radix: 16)) : null,
      logoUrl: logoUrl,
      tenantName: tenantName,
    );
  }
}

final brandingProvider = NotifierProvider<BrandingNotifier, BrandingConfig>(BrandingNotifier.new);
