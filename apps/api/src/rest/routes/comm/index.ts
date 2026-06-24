import type { FastifyInstance } from 'fastify'
import { commTeamRoutes } from './teams.routes.js'
import { commChannelRoutes } from './channels.routes.js'
import { commDmRoutes } from './dm.routes.js'
import { commPresenceRoutes } from './presence.routes.js'
import { commMeetingRoutes } from './meetings.routes.js'
import { commAnnouncementRoutes } from './announcements.routes.js'
import { commSearchRoutes } from './search.routes.js'
import { commDashboardRoutes } from './dashboard.routes.js'

export async function commRoutes(app: FastifyInstance) {
  await app.register(commDashboardRoutes, { prefix: '/dashboard' })
  await app.register(commTeamRoutes, { prefix: '/teams' })
  await app.register(commChannelRoutes, { prefix: '/channels' })
  await app.register(commDmRoutes, { prefix: '/dm' })
  await app.register(commPresenceRoutes, { prefix: '/presence' })
  await app.register(commMeetingRoutes, { prefix: '/meetings' })
  await app.register(commAnnouncementRoutes, { prefix: '/announcements' })
  await app.register(commSearchRoutes, { prefix: '/search' })
}
