import type {
  RenoPluginManifest,
  PluginContext,
  PluginHookName,
} from './types.js'

type HookHandler = (context: PluginContext, payload?: unknown) => Promise<unknown> | unknown

export abstract class RenoPlugin {
  abstract readonly manifest: RenoPluginManifest

  private hooks: Partial<Record<PluginHookName, HookHandler>> = {}

  protected on(hookName: PluginHookName, handler: HookHandler): void {
    this.hooks[hookName] = handler
  }

  async executeHook(hookName: PluginHookName, context: PluginContext, payload?: unknown): Promise<unknown> {
    const handler = this.hooks[hookName]
    if (!handler) return undefined
    return handler(context, payload)
  }

  hasHook(hookName: PluginHookName): boolean {
    return hookName in this.hooks
  }

  getManifest(): RenoPluginManifest {
    return this.manifest
  }
}

export function definePlugin(manifest: RenoPluginManifest, setup: (plugin: RenoPlugin) => void): RenoPlugin {
  class InlinePlugin extends RenoPlugin {
    readonly manifest = manifest
    public on = super['on'].bind(this) as RenoPlugin['on']
  }
  const instance = new InlinePlugin()
  setup(instance)
  return instance
}
