// Plugin manifest — every plugin must export a manifest
export interface RenoPluginManifest {
  id: string                  // unique reverse-domain ID e.g. "com.acme.my-plugin"
  name: string
  version: string             // semver
  description: string
  author: string
  license: string
  minRenoVersion: string      // minimum Reno version required
  permissions: PluginPermission[]
  hooks?: PluginHookName[]    // which lifecycle hooks this plugin uses
  routes?: PluginRouteConfig[]
  widgets?: PluginWidgetConfig[]
  settings?: PluginSettingDefinition[]
}

export type PluginPermission =
  | 'read:users' | 'write:users'
  | 'read:hr' | 'write:hr'
  | 'read:finance' | 'write:finance'
  | 'read:crm' | 'write:crm'
  | 'read:inventory' | 'write:inventory'
  | 'read:analytics'
  | 'send:notifications'
  | 'manage:webhooks'
  | 'read:audit_logs'

export type PluginHookName =
  | 'onInstall' | 'onUninstall' | 'onEnable' | 'onDisable'
  | 'beforeUserCreate' | 'afterUserCreate'
  | 'beforeInvoiceCreate' | 'afterInvoiceCreate' | 'afterInvoicePaid'
  | 'beforeTicketCreate' | 'afterTicketCreate' | 'afterTicketResolved'
  | 'afterBackupCompleted' | 'afterDeploymentCompleted'
  | 'onSchedule'  // triggered by cron-like scheduler

export interface PluginRouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string           // relative path under /v1/plugins/{pluginId}/
  handler: string        // exported function name in the plugin entrypoint
}

export interface PluginWidgetConfig {
  id: string
  name: string
  placement: 'dashboard' | 'sidebar' | 'header' | 'footer' | 'page'
  component: string      // exported React component name
}

export interface PluginSettingDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'secret' | 'select'
  required?: boolean
  default?: unknown
  options?: { value: string; label: string }[]
}

// Context injected into every hook handler
export interface PluginContext {
  tenantId: string
  pluginId: string
  settings: Record<string, unknown>
  log: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void
  emit: (eventType: string, data: Record<string, unknown>) => Promise<void>
}
