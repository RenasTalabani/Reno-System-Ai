// Variable interpolation: resolves {{path.to.value}} in strings using dot notation

function resolvePath(path: string, ctx: Record<string, any>): any {
  return path.trim().split('.').reduce((obj, key) => obj?.[key], ctx)
}

export function interpolate(template: string, ctx: Record<string, any>): string {
  if (typeof template !== 'string') return String(template ?? '')
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const val = resolvePath(path, ctx)
    return val !== undefined && val !== null ? String(val) : match
  })
}

export function interpolateDeep(obj: any, ctx: Record<string, any>): any {
  if (typeof obj === 'string') return interpolate(obj, ctx)
  if (Array.isArray(obj)) return obj.map(item => interpolateDeep(item, ctx))
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, interpolateDeep(v, ctx)]))
  }
  return obj
}

export function buildContext(triggerData: any, variables: Record<string, any>, extra: Record<string, any> = {}): Record<string, any> {
  return { triggerData: triggerData ?? {}, variables: variables ?? {}, ...extra }
}
