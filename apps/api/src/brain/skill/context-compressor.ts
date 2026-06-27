// Compress business context before sending to external AI providers.
// Rules: never expose secrets, summarize large arrays, track compression ratio.

const SECRET_KEYS = new Set([
  'password', 'apiKey', 'api_key', 'apikey', 'secret', 'token', 'accessToken',
  'access_token', 'refreshToken', 'refresh_token', 'privateKey', 'private_key',
  'encryptedApiKey', 'encrypted_api_key', 'ssn', 'nationalId', 'national_id',
  'passportNo', 'passport_no', 'bankAccount', 'bank_account', 'cardNumber',
  'card_number', 'cvv', 'pin', 'salary', 'salaryBase', 'salary_base',
  'netPay', 'net_pay', 'grossPay', 'gross_pay',
])

export interface CompressedContext {
  data: unknown
  originalChars: number
  compressedChars: number
  compressionRatio: number
  fieldsStripped: string[]
  arraySummaries: string[]
}

const MAX_ARRAY_ITEMS = 10
const MAX_STRING_LENGTH = 500

export function compressContext(input: unknown, label = 'context'): CompressedContext {
  const original = JSON.stringify(input)
  const fieldsStripped: string[] = []
  const arraySummaries: string[] = []

  const compressed = stripAndSummarize(input, '', fieldsStripped, arraySummaries)
  const compressedStr = JSON.stringify(compressed)

  return {
    data: compressed,
    originalChars: original.length,
    compressedChars: compressedStr.length,
    compressionRatio: original.length > 0 ? Math.round((1 - compressedStr.length / original.length) * 100) / 100 : 0,
    fieldsStripped,
    arraySummaries,
  }
}

function stripAndSummarize(
  value: unknown,
  path: string,
  stripped: string[],
  summaries: string[]
): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') {
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      return value.slice(0, MAX_STRING_LENGTH) + '… [truncated]'
    }
    return value
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      summaries.push(`${path}: array of ${value.length} items, showing first ${MAX_ARRAY_ITEMS}`)
      const truncated = value.slice(0, MAX_ARRAY_ITEMS).map((item, i) =>
        stripAndSummarize(item, `${path}[${i}]`, stripped, summaries)
      )
      return [...truncated, `… and ${value.length - MAX_ARRAY_ITEMS} more`]
    }
    return value.map((item, i) => stripAndSummarize(item, `${path}[${i}]`, stripped, summaries))
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const keyLower = key.toLowerCase()
    if (SECRET_KEYS.has(key) || SECRET_KEYS.has(keyLower) || isSecretKey(key)) {
      stripped.push(path ? `${path}.${key}` : key)
      continue
    }
    result[key] = stripAndSummarize(val, path ? `${path}.${key}` : key, stripped, summaries)
  }
  return result
}

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    lower.includes('password') ||
    lower.includes('secret') ||
    lower.includes('apikey') ||
    lower.includes('api_key') ||
    lower.includes('token') && !lower.includes('totaltoken') && !lower.includes('prompttoken') ||
    lower.includes('private_key') ||
    lower.includes('encrypted')
  )
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function formatCompressedContextForPrompt(context: CompressedContext): string {
  const lines: string[] = []
  lines.push(JSON.stringify(context.data, null, 2))
  if (context.fieldsStripped.length > 0) {
    lines.push(`\n[Note: ${context.fieldsStripped.length} sensitive field(s) were redacted for security]`)
  }
  if (context.arraySummaries.length > 0) {
    lines.push(`[Note: Large datasets were summarized — ${context.arraySummaries.length} array(s) truncated]`)
  }
  return lines.join('\n')
}
