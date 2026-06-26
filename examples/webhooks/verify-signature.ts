/**
 * Reno Webhooks — Signature Verification Example
 *
 * When Reno delivers a webhook, it signs the payload with HMAC-SHA256
 * using your webhook secret. Always verify the signature before processing.
 *
 * The signature is sent in the X-Reno-Signature header as: sha256=<hex>
 */
import crypto from 'node:crypto'

/**
 * Verify that a webhook payload came from Reno.
 * @param rawBody - The raw request body as a string (do NOT parse JSON first)
 * @param signature - The X-Reno-Signature header value
 * @param secret - Your webhook secret (from /v1/developer/webhooks response)
 */
export function verifyRenoWebhook(rawBody: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) return false
  const receivedHex = signature.slice(7)
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  // Timing-safe comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(receivedHex, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

// Example: Express.js webhook handler
// import express from 'express'
// const app = express()
// app.use('/webhook', express.raw({ type: 'application/json' }))
// app.post('/webhook', (req, res) => {
//   const sig = req.headers['x-reno-signature'] as string
//   const isValid = verifyRenoWebhook(req.body.toString(), sig, process.env.WEBHOOK_SECRET!)
//   if (!isValid) return res.status(401).send('Invalid signature')
//
//   const event = JSON.parse(req.body.toString())
//   console.log('Event type:', event.event)
//   console.log('Payload:', event.data)
//
//   res.status(200).send('OK')
// })

// Example: Next.js API route
// export async function POST(request: Request) {
//   const rawBody = await request.text()
//   const sig = request.headers.get('x-reno-signature') ?? ''
//   if (!verifyRenoWebhook(rawBody, sig, process.env.WEBHOOK_SECRET!)) {
//     return new Response('Unauthorized', { status: 401 })
//   }
//   const event = JSON.parse(rawBody)
//   // handle event...
//   return new Response('OK')
// }
