/**
 * Reno SDK — Basic Usage Example (TypeScript)
 *
 * Install: pnpm add @reno/sdk
 * Run:     npx tsx examples/typescript-sdk/basic-usage.ts
 */
import { createRenoClient } from '@reno/sdk'

async function main() {
  // Initialize the client
  const reno = createRenoClient({
    baseUrl: process.env['RENO_API_URL'] ?? 'http://localhost:4000',
    apiKey: process.env['RENO_API_KEY'] ?? '',
    tenantId: process.env['RENO_TENANT_ID'] ?? '',
  })

  // --- Authentication with username/password ---
  // const session = await reno.auth.login({
  //   email: 'admin@acme.com',
  //   password: 'secret',
  //   tenantSlug: 'acme',
  // })
  // console.log('Logged in as:', session.user.fullName)

  // --- Query Reno Brain ---
  console.log('Querying Reno Brain...')
  const answer = await reno.brain.query({
    query: 'What is the total revenue this month?',
  })
  console.log('Answer:', answer.answer)
  console.log('Confidence:', answer.confidence)

  // --- Register a webhook ---
  console.log('\nRegistering webhook...')
  const webhook = await reno.webhooks.create({
    name: 'Invoice Listener',
    url: 'https://webhook.site/your-unique-url',
    events: ['invoice.paid', 'invoice.overdue'],
  })
  console.log('Webhook ID:', webhook.id)
  console.log('Secret (save this!):', webhook.secret)

  // --- Send test event ---
  const testResult = await reno.webhooks.test(webhook.id)
  console.log('Test delivery:', testResult.success ? 'SUCCESS' : 'FAILED', `(HTTP ${testResult.statusCode})`)
}

main().catch(console.error)
