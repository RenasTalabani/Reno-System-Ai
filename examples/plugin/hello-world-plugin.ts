/**
 * Reno Plugin SDK — Hello World Plugin Example
 *
 * This plugin sends a Slack notification whenever a ticket is resolved.
 *
 * Install: pnpm add @reno/plugin-sdk
 */
import { definePlugin } from '@reno/plugin-sdk'

export default definePlugin(
  {
    id: 'com.example.ticket-slack-notifier',
    name: 'Ticket Slack Notifier',
    version: '1.0.0',
    description: 'Sends a Slack message when a helpdesk ticket is resolved.',
    author: 'Example Corp <dev@example.com>',
    license: 'MIT',
    minRenoVersion: '1.0.0',
    permissions: ['read:analytics', 'send:notifications'],
    hooks: ['afterTicketResolved', 'onInstall', 'onUninstall'],
    settings: [
      {
        key: 'slackWebhookUrl',
        label: 'Slack Webhook URL',
        type: 'secret',
        required: true,
      },
      {
        key: 'channel',
        label: 'Slack Channel',
        type: 'string',
        default: '#helpdesk',
        required: false,
      },
    ],
  },
  (plugin) => {
    plugin.on('onInstall', async (ctx) => {
      ctx.log('info', 'Ticket Slack Notifier installed successfully')
    })

    plugin.on('onUninstall', async (ctx) => {
      ctx.log('info', 'Ticket Slack Notifier uninstalled')
    })

    plugin.on('afterTicketResolved', async (ctx, ticket) => {
      const slackUrl = ctx.settings['slackWebhookUrl'] as string
      const channel = (ctx.settings['channel'] as string) ?? '#helpdesk'

      if (!slackUrl) {
        ctx.log('warn', 'slackWebhookUrl not configured')
        return
      }

      const t = ticket as { id: string; title: string; resolvedBy?: string }

      try {
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            text: `Ticket resolved: *${t.title}* (ID: \`${t.id}\`) by ${t.resolvedBy ?? 'agent'}`,
          }),
        })
        ctx.log('info', `Slack notification sent for ticket ${t.id}`)
      } catch (e) {
        ctx.log('error', `Failed to send Slack notification: ${e}`)
      }
    })
  },
)
