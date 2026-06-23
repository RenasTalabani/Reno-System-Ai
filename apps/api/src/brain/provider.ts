import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface AIResponse {
  content: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
  provider: string
  latencyMs: number
}

export interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'mock'
  apiKey?: string
  baseUrl?: string
  model: string
}

export async function callAI(
  messages: ChatMessage[],
  options: ChatOptions,
  config: ProviderConfig
): Promise<AIResponse> {
  const start = Date.now()

  if (config.provider === 'mock' || !config.apiKey) {
    return mockResponse(messages, config, start)
  }

  if (config.provider === 'anthropic') {
    return callAnthropic(messages, options, config, start)
  }

  if (config.provider === 'openai' || config.provider === 'google') {
    return callOpenAICompatible(messages, options, config, start)
  }

  return mockResponse(messages, config, start)
}

async function callAnthropic(
  messages: ChatMessage[],
  options: ChatOptions,
  config: ProviderConfig,
  start: number
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: config.apiKey })
  const model = options.model ?? config.model ?? 'claude-sonnet-4-6'

  const anthropicMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  const systemContent = options.systemPrompt ??
    messages.find(m => m.role === 'system')?.content

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: systemContent,
    messages: anthropicMessages,
  })

  const content = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as any).text)
    .join('')

  return {
    content,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    model,
    provider: 'anthropic',
    latencyMs: Date.now() - start,
  }
}

async function callOpenAICompatible(
  messages: ChatMessage[],
  options: ChatOptions,
  config: ProviderConfig,
  start: number
): Promise<AIResponse> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  })
  const model = options.model ?? config.model ?? 'gpt-4o'

  const oaiMessages: any[] = []
  if (options.systemPrompt) oaiMessages.push({ role: 'system', content: options.systemPrompt })
  oaiMessages.push(...messages.map(m => ({ role: m.role, content: m.content })))

  const response = await client.chat.completions.create({
    model,
    messages: oaiMessages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: Number(options.temperature ?? 0.7),
  })

  const choice = response.choices[0]
  if (!choice) throw new Error('No response choices returned from AI provider')
  return {
    content: choice.message.content ?? '',
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    model,
    provider: config.provider,
    latencyMs: Date.now() - start,
  }
}

function mockResponse(messages: ChatMessage[], config: ProviderConfig, start: number): AIResponse {
  const last = messages.filter(m => m.role === 'user').pop()
  const content = `[Reno Brain - Demo Mode]\n\nI received your message: "${last?.content ?? ''}"\n\nTo enable full AI capabilities, configure an API key in Settings → AI Providers. Reno Brain supports Anthropic Claude, OpenAI GPT, and Google Gemini.`

  return {
    content,
    promptTokens: 50,
    completionTokens: 60,
    totalTokens: 110,
    model: 'mock',
    provider: 'mock',
    latencyMs: Date.now() - start,
  }
}
