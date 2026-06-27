# Reno System — Developer Guide v1.0.0

---

## Overview

Reno System provides a full developer platform (Phase 27) including:
- REST API with OpenAPI 3.0.3 documentation
- TypeScript SDK (`@reno/sdk`)
- Plugin SDK (`@reno/plugin-sdk`)
- CLI tool (`@reno/cli`)
- Webhook system with HMAC-SHA256 signing
- Developer Portal at `/developer`

---

## API Authentication

All API calls require a Bearer token:
```bash
# Get token
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "..."}'

# Response
{"accessToken": "eyJ...", "refreshToken": "eyJ..."}

# Use in requests
curl https://api.yourdomain.com/api/v1/crm/contacts \
  -H "Authorization: Bearer eyJ..."
```

### API Keys (for integrations)
Generate long-lived API keys in **Settings → Developer → API Keys**:
```bash
curl https://api.yourdomain.com/api/v1/crm/contacts \
  -H "X-API-Key: reno_key_..."
```

---

## TypeScript SDK

### Installation
```bash
npm install @reno/sdk
# or
pnpm add @reno/sdk
```

### Usage
```typescript
import { RenoClient } from '@reno/sdk'

const reno = new RenoClient({
  baseUrl: 'https://api.yourdomain.com',
  apiKey: 'reno_key_...',
})

// List CRM contacts
const contacts = await reno.crm.contacts.list({
  page: 1,
  limit: 20,
  search: 'acme',
})

// Create invoice
const invoice = await reno.sales.invoices.create({
  customerId: 'cust_123',
  lineItems: [
    { productId: 'prod_456', quantity: 2, unitPrice: 100 },
  ],
  currency: 'USD',
  dueDate: '2026-07-31',
})

// Ask Reno Brain
const answer = await reno.brain.ask({
  question: 'What are my top 3 overdue invoices?',
  context: { module: 'finance' },
})
```

---

## Plugin SDK

### Create a plugin
```bash
npx @reno/cli plugin create my-plugin
cd my-plugin
pnpm install
```

### Plugin structure
```
my-plugin/
  src/
    index.ts        — plugin entry point
    routes.ts       — custom API routes
    hooks.ts        — lifecycle hooks
  reno-plugin.json  — plugin manifest
```

### Plugin manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "displayName": "My Plugin",
  "description": "Custom integration",
  "permissions": ["crm:read", "sales:read"],
  "hooks": ["invoice.created", "contact.updated"],
  "routes": ["/my-plugin"]
}
```

### Plugin hooks
```typescript
import { definePlugin, type PluginContext } from '@reno/plugin-sdk'

export default definePlugin({
  name: 'my-plugin',

  async onInvoiceCreated(ctx: PluginContext, invoice) {
    // Called when any invoice is created in this tenant
    await ctx.notify(invoice.customerId, `Invoice ${invoice.number} created`)
  },

  async onContactUpdated(ctx: PluginContext, contact) {
    // Sync to external CRM
    await fetch('https://external-crm.com/contacts', {
      method: 'PUT',
      body: JSON.stringify(contact),
    })
  },
})
```

### Install a plugin
```bash
# Via CLI
reno plugin install ./my-plugin

# Via API
POST /api/v1/plugins/install
{"packagePath": "/path/to/my-plugin"}
```

---

## Webhooks

### Register a webhook
```bash
POST /api/v1/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["invoice.created", "invoice.paid", "ticket.opened"],
  "secret": "your-webhook-secret"
}
```

### Verify webhook signature
```typescript
import crypto from 'crypto'

function verifyWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// In your Express handler
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-reno-signature'] as string
  const valid = verifyWebhook(
    JSON.stringify(req.body),
    sig,
    process.env.WEBHOOK_SECRET!
  )
  if (!valid) return res.status(401).end()

  // Process event
  const { event, data } = req.body
  if (event === 'invoice.paid') {
    console.log('Invoice paid:', data.id)
  }

  res.json({ received: true })
})
```

---

## OpenAPI Documentation

Interactive API docs available at: `https://api.yourdomain.com/docs`

Download OpenAPI spec:
```bash
curl https://api.yourdomain.com/docs/json > reno-openapi.json
```

---

## CLI Tool

### Installation
```bash
npm install -g @reno/cli
reno --version
```

### Commands
```bash
# Authentication
reno login                          # Login to Reno instance
reno logout                         # Logout

# Backup
reno backup --env production        # Create backup
reno backup list --env production   # List snapshots
reno rollback --env production --version <id>

# Deployment
reno deploy --env production --version 1.0.1

# Plugin management
reno plugin create my-plugin        # Scaffold new plugin
reno plugin install ./my-plugin     # Install plugin
reno plugin list                    # List installed plugins

# Database
reno db migrate                     # Run pending migrations
reno db status                      # Migration status
```

---

## REST API Reference

Full reference: `GET /docs`

### Pagination
All list endpoints support:
```
GET /api/v1/crm/contacts?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8
  }
}
```

### Error Format
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Contact not found"
}
```

### Rate Limits
- Default: 100 requests/minute
- Auth endpoints: 10 requests/minute
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Multi-Tenant Considerations

Every API call is automatically scoped to the authenticated user's tenant. There is no way to access another tenant's data via the API — this is enforced at the database level.

When building integrations:
- Generate a separate API key per tenant
- Do not share API keys between tenants
- Each API key inherits the permissions of its creating user

---

## AI / Brain API

```bash
# Ask Brain a question
POST /api/v1/brain/ask
{"question": "What is our MRR trend?", "context": {"module": "finance"}}

# Get today's briefing
GET /api/v1/brain/briefing/today

# Semantic search
GET /api/v1/brain/search/semantic?q=overdue+payments+high+risk

# Submit feedback on a recommendation
POST /api/v1/brain/feedback
{
  "sourceType": "recommendation",
  "sourceId": "rec_123",
  "outcome": "accepted",
  "rating": 5,
  "feedbackText": "Excellent suggestion, implemented immediately"
}
```

---

## Support

- OpenAPI Docs: `https://api.yourdomain.com/docs`
- SDK Repository: `packages/sdk/`
- Plugin Examples: `packages/plugin-sdk/examples/`
- CLI Source: `packages/cli/`
