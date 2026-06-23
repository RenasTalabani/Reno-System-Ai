import { buildContext } from './interpolate.js'

function resolvePath(path: string, ctx: Record<string, any>): any {
  // Support both {{path}} syntax and raw path
  const clean = path.replace(/^\{\{|\}\}$/g, '').trim()
  return clean.split('.').reduce((obj, key) => obj?.[key], ctx)
}

function evalSingle(field: string, operator: string, value: any, ctx: Record<string, any>): boolean {
  const actual = resolvePath(field, ctx)
  const numActual = Number(actual)
  const numValue = Number(value)

  switch (operator) {
    case 'eq': return actual == value
    case 'neq': return actual != value
    case 'gt': return numActual > numValue
    case 'gte': return numActual >= numValue
    case 'lt': return numActual < numValue
    case 'lte': return numActual <= numValue
    case 'contains': return String(actual ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains': return !String(actual ?? '').toLowerCase().includes(String(value).toLowerCase())
    case 'starts_with': return String(actual ?? '').startsWith(String(value))
    case 'ends_with': return String(actual ?? '').endsWith(String(value))
    case 'is_null': return actual === null || actual === undefined || actual === ''
    case 'is_not_null': return actual !== null && actual !== undefined && actual !== ''
    case 'in': return Array.isArray(value) ? value.includes(actual) : String(value).split(',').includes(String(actual))
    case 'not_in': return Array.isArray(value) ? !value.includes(actual) : !String(value).split(',').includes(String(actual))
    default: return false
  }
}

export interface Condition {
  field: string
  operator: string
  value?: any
}

export interface ConditionGroup {
  logic?: 'all' | 'any'  // 'all' = AND, 'any' = OR
  conditions: Condition[]
}

export function evaluateConditions(config: ConditionGroup, triggerData: any, variables: Record<string, any>): boolean {
  const ctx = buildContext(triggerData, variables)
  const logic = config.logic ?? 'all'
  const conditions = config.conditions ?? []

  if (conditions.length === 0) return true

  if (logic === 'all') {
    return conditions.every(c => evalSingle(c.field, c.operator, c.value, ctx))
  } else {
    return conditions.some(c => evalSingle(c.field, c.operator, c.value, ctx))
  }
}
