// Phase 54 — AI Multi-Channel Communication Hub: AI Engine

export const CHANNEL_TYPES = ['email', 'sms', 'push', 'chat', 'whatsapp', 'slack', 'in_app'] as const
export type ChannelType = typeof CHANNEL_TYPES[number]

// ── Built-in Templates ────────────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES = [
  {
    name: 'Welcome Email',
    slug: 'welcome_email',
    channelType: 'email',
    category: 'onboarding',
    subject: 'Welcome to {{company_name}}!',
    body: 'Hi {{first_name}},\n\nWelcome aboard! We\'re thrilled to have you with us.\n\nGet started at {{app_url}}\n\nBest,\nThe {{company_name}} Team',
    bodyHtml: '<h2>Welcome to {{company_name}}!</h2><p>Hi {{first_name}},</p><p>Welcome aboard! Click below to get started.</p><a href="{{app_url}}">Get Started</a>',
    variables: ['first_name', 'company_name', 'app_url'],
  },
  {
    name: 'Password Reset',
    slug: 'password_reset',
    channelType: 'email',
    category: 'security',
    subject: 'Reset your password',
    body: 'Hi {{first_name}},\n\nClick the link to reset your password: {{reset_link}}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.',
    bodyHtml: '<p>Hi {{first_name}},</p><p><a href="{{reset_link}}">Reset Password</a></p><p>Expires in 1 hour.</p>',
    variables: ['first_name', 'reset_link'],
  },
  {
    name: 'Invoice Reminder SMS',
    slug: 'invoice_reminder_sms',
    channelType: 'sms',
    category: 'finance',
    subject: null,
    body: 'Hi {{first_name}}, invoice #{{invoice_number}} for ${{amount}} is due on {{due_date}}. Pay at {{payment_url}}',
    bodyHtml: null,
    variables: ['first_name', 'invoice_number', 'amount', 'due_date', 'payment_url'],
  },
  {
    name: 'Lead Follow-Up',
    slug: 'lead_followup',
    channelType: 'email',
    category: 'sales',
    subject: 'Following up on your interest in {{product_name}}',
    body: 'Hi {{first_name}},\n\nThanks for your interest in {{product_name}}! I wanted to follow up.\n\nWould you be available for a 15-min call this week?\n\nBest,\n{{sender_name}}',
    bodyHtml: null,
    variables: ['first_name', 'product_name', 'sender_name'],
  },
  {
    name: 'Task Assignment Push',
    slug: 'task_assignment_push',
    channelType: 'push',
    category: 'productivity',
    subject: 'New Task Assigned',
    body: '{{task_title}} assigned to you by {{assigner_name}}. Due: {{due_date}}',
    bodyHtml: null,
    variables: ['task_title', 'assigner_name', 'due_date'],
  },
]

// ── Message Personalization ───────────────────────────────────────────────────

export function personalizeTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

// ── Send Simulation ────────────────────────────────────────────────────────────

export interface SendResult {
  status: 'delivered' | 'failed' | 'queued'
  messageId: string
  durationMs: number
  failureReason?: string
}

export function simulateSend(channelType: string, to: string, body: string): SendResult {
  const durationMs = 50 + Math.floor(Math.random() * 200)
  const shouldFail = Math.random() < 0.05

  if (shouldFail) {
    return { status: 'failed', messageId: `sim_${Date.now()}`, durationMs, failureReason: 'Delivery timeout' }
  }

  return { status: 'delivered', messageId: `sim_${channelType}_${Date.now()}`, durationMs }
}

// ── Campaign Metrics ───────────────────────────────────────────────────────────

export interface CampaignMetrics {
  deliveryRate: number
  openRate: number
  clickRate: number
  failureRate: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  recommendation: string
}

export function calculateCampaignMetrics(
  sent: number, delivered: number, opened: number, clicked: number, failed: number,
): CampaignMetrics {
  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0
  const clickRate = opened > 0 ? (clicked / opened) * 100 : 0
  const failureRate = sent > 0 ? (failed / sent) * 100 : 0

  const grade: CampaignMetrics['grade'] =
    openRate >= 40 && deliveryRate >= 95 ? 'A' :
    openRate >= 25 && deliveryRate >= 90 ? 'B' :
    openRate >= 15 ? 'C' :
    openRate >= 5  ? 'D' : 'F'

  const recommendation = openRate < 15
    ? 'Consider A/B testing subject lines to improve open rates'
    : clickRate < 5
    ? 'Add clearer CTAs to improve click rates'
    : deliveryRate < 90
    ? 'Clean your contact list to improve deliverability'
    : 'Campaign is performing well'

  return { deliveryRate, openRate, clickRate, failureRate, grade, recommendation }
}

// ── AI Subject Line Optimizer ─────────────────────────────────────────────────

export function optimizeSubjectLine(original: string, channelType: string): string {
  if (channelType !== 'email') return original
  const POWER_WORDS = ['[Exclusive]', '[Limited Time]', 'Don\'t miss:', 'Quick question:', 'Re:']
  const prefix = POWER_WORDS[Math.floor(Math.random() * POWER_WORDS.length)]!
  return `${prefix} ${original}`
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export function generateCommSummary(
  totalMessages: number, totalCampaigns: number, activeChannels: number,
  totalDelivered: number,
): string {
  if (totalMessages === 0) return 'No messages sent yet. Create a channel and start a campaign.'
  const deliveryRate = totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 100) : 0
  return `${totalMessages} messages · ${deliveryRate}% delivery · ${totalCampaigns} campaigns · ${activeChannels} channels`
}
