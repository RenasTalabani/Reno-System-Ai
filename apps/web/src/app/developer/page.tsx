'use client'

export default function DeveloperPortalPage() {
  const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

  const sections = [
    {
      title: 'Getting Started',
      items: [
        {
          label: 'Interactive API Docs (Swagger)',
          href: `${API_BASE}/docs`,
          description: 'Explore every endpoint interactively. Try requests directly from your browser.',
          badge: 'Live',
        },
        {
          label: 'OpenAPI JSON Spec',
          href: `${API_BASE}/docs/json`,
          description: 'Machine-readable OpenAPI 3.0 spec — import into Postman, Insomnia, or generate clients.',
          badge: 'JSON',
        },
      ],
    },
    {
      title: 'TypeScript SDK',
      items: [
        {
          label: 'Install @reno/sdk',
          code: 'pnpm add @reno/sdk',
          description: 'Official TypeScript/JavaScript SDK with full type safety and auto-completion.',
        },
        {
          label: 'Quick Start',
          code: `import { createRenoClient } from '@reno/sdk'

const reno = createRenoClient({
  baseUrl: '${API_BASE}',
  apiKey: process.env.RENO_API_KEY,
  tenantId: 'your-tenant-id',
})

// Query Reno Brain
const answer = await reno.brain.query({ query: 'What is our monthly revenue?' })
console.log(answer.answer)`,
          description: 'Full type safety, built-in error handling, and all API modules.',
        },
      ],
    },
    {
      title: 'Plugin SDK',
      items: [
        {
          label: 'Install @reno/plugin-sdk',
          code: 'pnpm add @reno/plugin-sdk',
          description: 'Build plugins and extensions that integrate deeply with Reno.',
        },
        {
          label: 'Plugin Example',
          code: `import { definePlugin } from '@reno/plugin-sdk'

export default definePlugin({
  id: 'com.acme.my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Sends a Slack message when an invoice is paid.',
  author: 'Acme Corp',
  license: 'MIT',
  minRenoVersion: '1.0.0',
  permissions: ['read:finance'],
  hooks: ['afterInvoicePaid'],
}, (plugin) => {
  plugin.on('afterInvoicePaid', async (ctx, invoice) => {
    ctx.log('info', \`Invoice paid: \${invoice.id}\`)
    await ctx.emit('slack.send', { text: \`Invoice \${invoice.number} paid!\` })
  })
})`,
          description: '20+ lifecycle hooks, permission system, and widget support.',
        },
      ],
    },
    {
      title: 'Webhooks',
      items: [
        {
          label: 'Register a Webhook',
          code: `// POST /v1/developer/webhooks
const webhook = await reno.client.post('/developer/webhooks', {
  name: 'Invoice Notifier',
  url: 'https://your-server.com/reno-webhook',
  events: ['invoice.paid', 'ticket.resolved'],
})
// Save webhook.secret securely — it is only returned once`,
          description: 'Subscribe to 20+ event types. Deliveries are signed with HMAC-SHA256.',
        },
        {
          label: 'Verify Signature',
          code: `import crypto from 'crypto'

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}`,
          description: 'Always verify the X-Reno-Signature header to prevent spoofing.',
        },
      ],
    },
    {
      title: 'Authentication',
      items: [
        {
          label: 'Bearer Token',
          code: `// Login and use JWT
const { accessToken } = await reno.auth.login({
  email: 'user@company.com',
  password: 'password',
  tenantSlug: 'acme',
})
// accessToken is set automatically on the SDK client`,
          description: 'Short-lived JWT (15min) + refresh token (7 days).',
        },
        {
          label: 'API Key',
          code: `// Create API key via dashboard or API
// POST /v1/developer/api-keys
// Then use:
fetch('/v1/brain/query', {
  headers: { 'X-API-Key': 'reno_...' }
})`,
          description: 'Long-lived API keys for server-to-server integration.',
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">R</div>
            <span className="text-sm text-gray-400">Reno System</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm text-gray-300">Developer Portal</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Developer Platform</h1>
          <p className="mt-2 text-gray-400 max-w-2xl">
            Build integrations, plugins, and extensions on top of Reno System. Everything you need to get started.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href={`${API_BASE}/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              API Reference →
            </a>
            <a
              href={`${API_BASE}/docs/json`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              OpenAPI JSON
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-12">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-xl font-semibold text-white mb-4">{section.title}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white">{item.label}</h3>
                    {'badge' in item && item.badge && (
                      <span className="rounded-full bg-green-900 px-2 py-0.5 text-xs text-green-300">{item.badge}</span>
                    )}
                    {'href' in item && item.href && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Open →
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                  {'code' in item && item.code && (
                    <pre className="rounded-lg bg-gray-950 border border-gray-800 p-3 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                      {item.code}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Links */}
        <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Quick Links</h2>
          <div className="grid gap-2 text-sm">
            <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Swagger UI — {API_BASE}/docs</a>
            <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Health Check — {API_BASE}/health</a>
            <a href={`${API_BASE}/v1/developer/sandbox`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Sandbox Info — {API_BASE}/v1/developer/sandbox</a>
            <a href={`${API_BASE}/v1/developer/events`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Webhook Events — {API_BASE}/v1/developer/events</a>
          </div>
        </div>
      </div>
    </div>
  )
}
