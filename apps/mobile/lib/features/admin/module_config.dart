import 'package:flutter/material.dart';

// Config for one admin/back-office module's mobile list+detail view.
// `endpoint` is the list endpoint (e.g. '/v1/users'); items come back as
// either a bare list or {data: [...]} — ModuleListScreen handles both.
class ModuleConfig {
  final String key; // used for the go_router path segment
  final String title;
  final IconData icon;
  final String endpoint;
  final String Function(Map<String, dynamic> item) titleField;
  final String Function(Map<String, dynamic> item) subtitleField;
  final String? statusField;

  const ModuleConfig({
    required this.key,
    required this.title,
    required this.icon,
    required this.endpoint,
    required this.titleField,
    required this.subtitleField,
    this.statusField,
  });
}

String _n(Map<String, dynamic> item, List<String> keys, [String fallback = '']) {
  for (final k in keys) {
    final v = item[k];
    if (v != null && '$v'.isNotEmpty) return '$v';
  }
  return fallback;
}

final identityModules = <ModuleConfig>[
  ModuleConfig(
    key: 'users',
    title: 'Users',
    icon: Icons.people_outline,
    endpoint: '/v1/users',
    titleField: (i) => _n(i, ['fullName', 'name', 'email'], 'User'),
    subtitleField: (i) => _n(i, ['email']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'roles',
    title: 'Roles & Permissions',
    icon: Icons.shield_outlined,
    endpoint: '/v1/roles',
    titleField: (i) => _n(i, ['name'], 'Role'),
    subtitleField: (i) => '${(i['rolePermissions'] as List?)?.length ?? 0} permissions',
  ),
  ModuleConfig(
    key: 'organization',
    title: 'Organization',
    icon: Icons.apartment_outlined,
    endpoint: '/v1/org/companies',
    titleField: (i) => _n(i, ['name'], 'Company'),
    subtitleField: (i) => _n(i, ['legalName', 'industry', 'code']),
  ),
];

final businessModules = <ModuleConfig>[
  ModuleConfig(
    key: 'hr',
    title: 'HR',
    icon: Icons.badge_outlined,
    endpoint: '/v1/hr/employees',
    titleField: (i) => _n(i, ['fullName', 'name'], 'Employee'),
    subtitleField: (i) => _n(i, ['jobTitle', 'department', 'email']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'projects',
    title: 'Projects',
    icon: Icons.folder_outlined,
    endpoint: '/v1/pm/projects',
    titleField: (i) => _n(i, ['name'], 'Project'),
    subtitleField: (i) => _n(i, ['description', 'code']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'crm',
    title: 'CRM',
    icon: Icons.contacts_outlined,
    endpoint: '/v1/crm/contacts',
    titleField: (i) => _n(i, ['fullName', 'name'], 'Contact'),
    subtitleField: (i) => _n(i, ['email', 'phone']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'sales',
    title: 'Sales',
    icon: Icons.point_of_sale_outlined,
    endpoint: '/v1/sales/orders',
    titleField: (i) => _n(i, ['number'], 'Order'),
    subtitleField: (i) => _n(i, ['totalAmount']) == '' ? '' : '\$${i['totalAmount']}',
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'finance',
    title: 'Finance',
    icon: Icons.account_balance_outlined,
    endpoint: '/v1/finance/accounts',
    titleField: (i) => _n(i, ['name'], 'Account'),
    subtitleField: (i) => _n(i, ['code', 'type']),
  ),
  ModuleConfig(
    key: 'inventory',
    title: 'Inventory',
    icon: Icons.inventory_2_outlined,
    endpoint: '/v1/inventory/products',
    titleField: (i) => _n(i, ['name'], 'Product'),
    subtitleField: (i) => _n(i, ['sku', 'code']),
  ),
  ModuleConfig(
    key: 'procurement',
    title: 'Procurement',
    icon: Icons.local_shipping_outlined,
    endpoint: '/v1/procurement/suppliers',
    titleField: (i) => _n(i, ['name'], 'Supplier'),
    subtitleField: (i) => _n(i, ['email', 'phone']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'manufacturing',
    title: 'Manufacturing',
    icon: Icons.precision_manufacturing_outlined,
    endpoint: '/v1/manufacturing/orders',
    titleField: (i) => _n(i, ['number'], 'Work Order'),
    subtitleField: (i) => _n(i, ['productName']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'analytics',
    title: 'Analytics',
    icon: Icons.pie_chart_outline,
    endpoint: '/v1/analytics/dashboards',
    titleField: (i) => _n(i, ['name'], 'Dashboard'),
    subtitleField: (i) => _n(i, ['description', 'type']),
  ),
];

final workspaceModules = <ModuleConfig>[
  ModuleConfig(
    key: 'knowledge',
    title: 'Knowledge Base',
    icon: Icons.menu_book_outlined,
    endpoint: '/v1/kb/articles',
    titleField: (i) => _n(i, ['title'], 'Article'),
    subtitleField: (i) => _n(i, ['excerpt']),
    statusField: 'status',
  ),
];

final platformModules = <ModuleConfig>[
  ModuleConfig(
    key: 'marketplace',
    title: 'Marketplace',
    icon: Icons.storefront_outlined,
    endpoint: '/v1/marketplace/plugins',
    titleField: (i) => _n(i, ['name'], 'Plugin'),
    subtitleField: (i) => _n(i, ['shortDescription', 'category']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'ai-executive',
    title: 'AI Executive',
    icon: Icons.smart_toy_outlined,
    endpoint: '/v1/ai-exec/executives',
    titleField: (i) => _n(i, ['name'], 'Executive'),
    subtitleField: (i) => _n(i, ['role']),
  ),
];

// Intelligence group — deep enterprise/AI-ops tooling. Each screen is a
// simple real-data list+detail view against the same endpoint the web app
// uses; nothing here has bespoke forms/actions the way core business
// modules might eventually need them.
final intelligenceModules = <ModuleConfig>[
  ModuleConfig(key: 'automation', title: 'Automation', icon: Icons.auto_awesome_outlined, endpoint: '/v1/automation/workflows', titleField: (i) => _n(i, ['name'], 'Workflow'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'knowledge-graph', title: 'Knowledge Graph', icon: Icons.hub_outlined, endpoint: '/v1/knowledge-graph/entities', titleField: (i) => _n(i, ['name'], 'Entity'), subtitleField: (i) => _n(i, ['type'])),
  ModuleConfig(key: 'agents-platform', title: 'AI Agents', icon: Icons.smart_toy_outlined, endpoint: '/v1/agents-platform/agents', titleField: (i) => _n(i, ['name'], 'Agent'), subtitleField: (i) => _n(i, ['type', 'slug'])),
  ModuleConfig(key: 'action-layer', title: 'Action Layer', icon: Icons.bolt_outlined, endpoint: '/v1/action-layer/tools', titleField: (i) => _n(i, ['name'], 'Tool'), subtitleField: (i) => _n(i, ['category']), statusField: 'status'),
  ModuleConfig(key: 'learning', title: 'Learning & Opt.', icon: Icons.school_outlined, endpoint: '/v1/learning/events', titleField: (i) => _n(i, ['eventType'], 'Event'), subtitleField: (i) => _n(i, ['sourceModule', 'outcome'])),
  ModuleConfig(key: 'aos', title: 'AOS Runtime', icon: Icons.memory_outlined, endpoint: '/v1/aos/jobs', titleField: (i) => _n(i, ['name'], 'Job'), subtitleField: (i) => _n(i, ['jobType']), statusField: 'status'),
  ModuleConfig(key: 'process-automation', title: 'Process Automation', icon: Icons.account_tree_outlined, endpoint: '/v1/pae/workflows', titleField: (i) => _n(i, ['name'], 'Workflow'), subtitleField: (i) => '${i['totalRuns'] ?? 0} runs', statusField: 'status'),
  ModuleConfig(key: 'document-intelligence', title: 'Document AI', icon: Icons.description_outlined, endpoint: '/v1/adi/documents', titleField: (i) => _n(i, ['name'], 'Document'), subtitleField: (i) => _n(i, ['mimeType']), statusField: 'status'),
  ModuleConfig(key: 'comm-hub', title: 'Comm Hub', icon: Icons.forum_outlined, endpoint: '/v1/mch/messages', titleField: (i) => _n(i, ['subject', 'toAddress'], 'Message'), subtitleField: (i) => _n(i, ['channelType']), statusField: 'status'),
  ModuleConfig(key: 'command-center', title: 'Command Center', icon: Icons.dashboard_customize_outlined, endpoint: '/v1/pcc/alerts', titleField: (i) => _n(i, ['title', 'message'], 'Alert'), subtitleField: (i) => _n(i, ['severity']), statusField: 'status'),
  ModuleConfig(key: 'predictive-analytics', title: 'Predictive AI', icon: Icons.query_stats_outlined, endpoint: '/v1/apa/forecasts', titleField: (i) => _n(i, ['name', 'model'], 'Forecast'), subtitleField: (i) => _n(i, ['status'])),
  ModuleConfig(key: 'customer-success', title: 'Customer Success', icon: Icons.emoji_people_outlined, endpoint: '/v1/csp/customers', titleField: (i) => _n(i, ['name'], 'Customer'), subtitleField: (i) => 'Health: ${i['healthScore'] ?? '—'}'),
  ModuleConfig(key: 'sales-intelligence', title: 'Sales Intelligence', icon: Icons.insights_outlined, endpoint: '/v1/si/deals', titleField: (i) => _n(i, ['name', 'title'], 'Deal'), subtitleField: (i) => _n(i, ['value']) == '' ? '' : '\$${i['value']}', statusField: 'status'),
  ModuleConfig(key: 'hr-intelligence', title: 'HR Intelligence', icon: Icons.psychology_outlined, endpoint: '/v1/hri/employees', titleField: (i) => _n(i, ['name'], 'Employee'), subtitleField: (i) => _n(i, ['role', 'title']), statusField: 'status'),
  ModuleConfig(key: 'financial-intelligence', title: 'Financial AI', icon: Icons.savings_outlined, endpoint: '/v1/fi/ledger', titleField: (i) => _n(i, ['account', 'period'], 'Entry'), subtitleField: (i) => _n(i, ['amount']), statusField: 'status'),
  ModuleConfig(key: 'supply-chain-ai', title: 'Supply Chain AI', icon: Icons.local_shipping_outlined, endpoint: '/v1/sci/suppliers', titleField: (i) => _n(i, ['name'], 'Supplier'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'marketing-ai', title: 'Marketing AI', icon: Icons.campaign_outlined, endpoint: '/v1/mki/campaigns', titleField: (i) => _n(i, ['name'], 'Campaign'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'operations-ai', title: 'Operations AI', icon: Icons.settings_suggest_outlined, endpoint: '/v1/opi/processes', titleField: (i) => _n(i, ['name'], 'Process'), subtitleField: (i) => 'Efficiency: ${i['aiEfficiencyScore'] ?? '—'}', statusField: 'status'),
  ModuleConfig(key: 'legal-ai', title: 'Legal AI', icon: Icons.gavel_outlined, endpoint: '/v1/lci/contracts', titleField: (i) => _n(i, ['name', 'title'], 'Contract'), subtitleField: (i) => 'Risk: ${i['aiRiskScore'] ?? '—'}', statusField: 'status'),
  ModuleConfig(key: 'executive-ai', title: 'Executive AI', icon: Icons.leaderboard_outlined, endpoint: '/v1/ei/strategic-goals', titleField: (i) => _n(i, ['title'], 'Goal'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'llmops', title: 'LLMOps', icon: Icons.tune_outlined, endpoint: '/v1/llmops/providers', titleField: (i) => _n(i, ['name'], 'Provider'), subtitleField: (i) => _n(i, ['providerType'])),
  ModuleConfig(key: 'resilience', title: 'Resilience', icon: Icons.health_and_safety_outlined, endpoint: '/v1/resilience/health', titleField: (i) => _n(i, ['component'], 'Component'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'dashboards', title: 'Dashboards', icon: Icons.dashboard_outlined, endpoint: '/v1/dashboards', titleField: (i) => _n(i, ['name'], 'Dashboard'), subtitleField: (i) => _n(i, ['category'])),
  ModuleConfig(key: 'reports', title: 'Reports & BI', icon: Icons.summarize_outlined, endpoint: '/v1/reports', titleField: (i) => _n(i, ['name'], 'Report'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'export-engine', title: 'Export Engine', icon: Icons.upload_file_outlined, endpoint: '/v1/export-engine/jobs', titleField: (i) => _n(i, ['name', 'format'], 'Export'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'notification-center', title: 'Notification Center', icon: Icons.campaign_outlined, endpoint: '/v1/notification-center/broadcasts', titleField: (i) => _n(i, ['title', 'subject'], 'Broadcast'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'workflow-automation', title: 'Workflow Automation', icon: Icons.schema_outlined, endpoint: '/v1/workflow-automation/workflows', titleField: (i) => _n(i, ['name'], 'Workflow'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'api-gateway', title: 'API Gateway', icon: Icons.router_outlined, endpoint: '/v1/api-gateway/apis', titleField: (i) => _n(i, ['name'], 'API'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'webhooks', title: 'Webhooks', icon: Icons.webhook_outlined, endpoint: '/v1/webhooks/endpoints', titleField: (i) => _n(i, ['name', 'url'], 'Webhook'), subtitleField: (i) => _n(i, ['url']), statusField: 'status'),
  ModuleConfig(key: 'event-bus', title: 'Event Bus', icon: Icons.stream_outlined, endpoint: '/v1/event-bus/streams', titleField: (i) => _n(i, ['name'], 'Stream'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'kubernetes', title: 'Kubernetes', icon: Icons.hub_outlined, endpoint: '/v1/kubernetes/clusters', titleField: (i) => _n(i, ['name'], 'Cluster'), subtitleField: (i) => _n(i, ['region']), statusField: 'status'),
  ModuleConfig(key: 'multi-region', title: 'Multi-Region', icon: Icons.public_outlined, endpoint: '/v1/multi-region/regions', titleField: (i) => _n(i, ['name'], 'Region'), subtitleField: (i) => _n(i, ['isPrimary']) == 'true' ? 'Primary' : '', statusField: 'status'),
  ModuleConfig(key: 'auto-scaling', title: 'Auto Scaling', icon: Icons.trending_up_outlined, endpoint: '/v1/auto-scaling/targets', titleField: (i) => _n(i, ['name'], 'Target'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'queue-cluster', title: 'Queue Cluster', icon: Icons.layers_outlined, endpoint: '/v1/queue-cluster/clusters', titleField: (i) => _n(i, ['name'], 'Cluster'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'cdn-edge', title: 'CDN & Edge', icon: Icons.cloud_outlined, endpoint: '/v1/cdn-edge/zones', titleField: (i) => _n(i, ['name', 'domain'], 'Zone'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'zero-trust', title: 'Zero Trust', icon: Icons.gpp_good_outlined, endpoint: '/v1/zero-trust/policies', titleField: (i) => _n(i, ['name'], 'Policy'), subtitleField: (i) => 'Priority: ${i['priority'] ?? '—'}'),
  ModuleConfig(key: 'soc', title: 'SOC', icon: Icons.security_outlined, endpoint: '/v1/soc/incidents', titleField: (i) => _n(i, ['title'], 'Incident'), subtitleField: (i) => _n(i, ['severity']), statusField: 'status'),
  ModuleConfig(key: 'siem', title: 'SIEM', icon: Icons.policy_outlined, endpoint: '/v1/siem/sources', titleField: (i) => _n(i, ['name'], 'Source'), subtitleField: (i) => _n(i, ['sourceType']), statusField: 'status'),
  ModuleConfig(key: 'compliance-auto', title: 'Compliance Auto', icon: Icons.fact_check_outlined, endpoint: '/v1/compliance-auto/frameworks', titleField: (i) => _n(i, ['name'], 'Framework'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'secrets-mgmt', title: 'Secrets', icon: Icons.key_outlined, endpoint: '/v1/secrets-mgmt/vaults', titleField: (i) => _n(i, ['name'], 'Vault'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'plugins-marketplace', title: 'Plugin Market', icon: Icons.extension_outlined, endpoint: '/v1/plugins-marketplace/plugins', titleField: (i) => _n(i, ['name'], 'Plugin'), subtitleField: (i) => _n(i, ['slug'])),
  ModuleConfig(key: 'sdk', title: 'SDK Generator', icon: Icons.code_outlined, endpoint: '/v1/sdk/specs', titleField: (i) => _n(i, ['name'], 'Spec'), subtitleField: (i) => _n(i, ['version'])),
  ModuleConfig(key: 'extensions-store', title: 'Extension Store', icon: Icons.widgets_outlined, endpoint: '/v1/extensions-store/extensions', titleField: (i) => _n(i, ['name'], 'Extension'), subtitleField: (i) => _n(i, ['extType'])),
  ModuleConfig(key: 'public-api', title: 'Public API', icon: Icons.api_outlined, endpoint: '/v1/public-api/clients', titleField: (i) => _n(i, ['name'], 'Client'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'dev-console', title: 'Dev Console', icon: Icons.terminal_outlined, endpoint: '/v1/dev-console/apps', titleField: (i) => _n(i, ['name'], 'App'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'fine-tuning', title: 'Fine-Tuning', icon: Icons.model_training_outlined, endpoint: '/v1/fine-tuning/jobs', titleField: (i) => _n(i, ['name'], 'Job'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'ai-governance', title: 'AI Governance', icon: Icons.balance_outlined, endpoint: '/v1/ai-governance/policies', titleField: (i) => _n(i, ['name'], 'Policy'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'explainability', title: 'Explainability', icon: Icons.lightbulb_outline, endpoint: '/v1/explainability/decisions', titleField: (i) => _n(i, ['title', 'modelRef'], 'Decision'), subtitleField: (i) => _n(i, ['createdAt'])),
  ModuleConfig(key: 'ai-compliance', title: 'AI Compliance', icon: Icons.rule_outlined, endpoint: '/v1/ai-compliance/regulations', titleField: (i) => _n(i, ['name'], 'Regulation'), subtitleField: (i) => _n(i, ['jurisdiction'])),
  ModuleConfig(key: 'ai-benchmarking', title: 'AI Benchmarking', icon: Icons.speed_outlined, endpoint: '/v1/ai-benchmarking/suites', titleField: (i) => _n(i, ['name'], 'Suite'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'licensing', title: 'Licensing', icon: Icons.card_membership_outlined, endpoint: '/v1/licensing/plans', titleField: (i) => _n(i, ['name'], 'Plan'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'customer-portal', title: 'Customer Portal', icon: Icons.storefront_outlined, endpoint: '/v1/customer-portal/accounts', titleField: (i) => _n(i, ['name'], 'Account'), subtitleField: (i) => _n(i, ['createdAt']), statusField: 'status'),
  ModuleConfig(key: 'release', title: 'Release', icon: Icons.rocket_launch_outlined, endpoint: '/v1/release/releases', titleField: (i) => _n(i, ['name', 'version'], 'Release'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
  ModuleConfig(key: 'docs-hub', title: 'Docs Hub', icon: Icons.library_books_outlined, endpoint: '/v1/docs-hub/spaces', titleField: (i) => _n(i, ['name'], 'Space'), subtitleField: (i) => _n(i, ['position'])),
  ModuleConfig(key: 'certification', title: 'Certification', icon: Icons.workspace_premium_outlined, endpoint: '/v1/certification/programs', titleField: (i) => _n(i, ['name'], 'Program'), subtitleField: (i) => _n(i, ['status']), statusField: 'status'),
];

final systemModules = <ModuleConfig>[
  ModuleConfig(
    key: 'service-desk',
    title: 'Service Desk',
    icon: Icons.headset_mic_outlined,
    endpoint: '/v1/helpdesk/tickets',
    titleField: (i) => _n(i, ['subject'], 'Ticket'),
    subtitleField: (i) => _n(i, ['number']),
    statusField: 'status',
  ),
  ModuleConfig(
    key: 'audit-logs',
    title: 'Audit Logs',
    icon: Icons.receipt_long_outlined,
    endpoint: '/v1/audit-logs',
    titleField: (i) => _n(i, ['action'], 'Action'),
    subtitleField: (i) => _n(i, ['module', 'entityType']),
  ),
];
