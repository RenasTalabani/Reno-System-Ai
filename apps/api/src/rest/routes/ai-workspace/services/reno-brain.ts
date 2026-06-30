/**
 * Reno Brain adapter — primary AI provider.
 * External providers (Claude, OpenAI) are DISABLED BY DEFAULT.
 * Tenant admin must explicitly enable them via tenant settings.
 */

export type AIProvider = 'reno-brain' | 'claude' | 'openai'

export interface AIResponse {
  content: string
  provider: AIProvider
  tokens: number
  model: string
}

export async function runRenoBrain(prompt: string, context: string): Promise<AIResponse> {
  // Reno Brain is the internal primary provider.
  // In production this calls the Reno Brain inference engine.
  // Here we return a structured response to keep the API functional.
  const fullPrompt = `${context}\n\n${prompt}`
  const words = fullPrompt.split(' ').length

  const response = generateRenoBrainResponse(prompt)

  return {
    content: response,
    provider: 'reno-brain',
    tokens: Math.ceil(words * 1.3),
    model: 'reno-brain-v1',
  }
}

function generateRenoBrainResponse(prompt: string): string {
  const lower = prompt.toLowerCase()

  if (lower.includes('search') || lower.includes('find')) {
    return 'I can search across all your Reno modules. Use the /search endpoint with your query to find records across CRM, HR, Finance, Documents, and more.'
  }
  if (lower.includes('document') || lower.includes('pdf') || lower.includes('word')) {
    return 'I can analyze documents for you. Upload your document via the /documents/analyze endpoint and I will provide a summary, key points, and suggestions.'
  }
  if (lower.includes('task') || lower.includes('execute') || lower.includes('run')) {
    return 'I can create an executable task for you. Describe the steps you need and I will build a task plan that requires your approval before execution.'
  }
  if (lower.includes('code') || lower.includes('function') || lower.includes('bug')) {
    return 'I can help with code review and suggestions. Share the code snippet and I will explain it, identify issues, or suggest improvements — without making any commits automatically.'
  }
  if (lower.includes('report') || lower.includes('chart') || lower.includes('analytics')) {
    return 'I can help generate reports from your Reno data. Specify the module and time range and I will build a summary with key metrics.'
  }
  if (lower.includes('help') || lower.includes('what can')) {
    return `I am Reno Brain, your AI workspace assistant. I can:
• Search across all Reno modules
• Analyze documents (PDF, Word, Excel, Markdown)
• Create and execute approved tasks
• Review and explain code
• Build reports from your data
• Remember your active projects and recent work
What would you like to do?`
  }

  return `I understand you're asking about: "${prompt.substring(0, 100)}". As Reno Brain, I'm here to help you navigate and work with your Reno platform. Could you provide more details about what you need?`
}

export async function isProviderEnabled(tenantId: string, provider: 'claude' | 'openai'): Promise<boolean> {
  // External providers MUST be explicitly enabled by tenant admin in settings.
  // Default is always false — never auto-enable external AI.
  try {
    const { prisma } = await import('@reno/database')
    const setting = await prisma.sysSetting.findFirst({
      where: { tenantId, module: 'ai-workspace', key: `provider_${provider}_enabled`, isActive: true },
    }).catch(() => null)
    const val = setting?.value
    return typeof val === 'string' ? val === 'true' : val === true
  } catch {
    return false
  }
}
