import Redis from 'ioredis'
import { EventEmitter } from 'node:events'
import type { RenoEvent } from './index.js'

const CHANNEL_PREFIX = 'reno:events:'

export class RedisEventBus extends EventEmitter {
  private pub: Redis
  private sub: Redis
  private started = false

  constructor(redisUrl: string) {
    super()
    this.setMaxListeners(200)
    this.pub = new Redis(redisUrl, { lazyConnect: true })
    this.sub = new Redis(redisUrl, { lazyConnect: true })
  }

  async connect() {
    if (this.started) return
    this.started = true
    await this.pub.connect()
    await this.sub.connect()

    this.sub.on('message', (channel: string, message: string) => {
      try {
        const event: RenoEvent = JSON.parse(message)
        const tenantChannel = channel.replace(CHANNEL_PREFIX, '')
        // emit on tenant channel and wildcard
        this.emit(tenantChannel, event)
        this.emit('*', event)
        this.emit(`${event.tenantId}:${event.type}`, event)
      } catch { /* ignore malformed */ }
    })
  }

  async publish<T>(event: Omit<RenoEvent<T>, 'id' | 'occurredAt'>): Promise<void> {
    const fullEvent: RenoEvent<T> = {
      ...event,
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
    }
    const channel = `${CHANNEL_PREFIX}${event.tenantId}`
    await this.pub.publish(channel, JSON.stringify(fullEvent))
    // Also emit locally for in-process subscribers
    this.emit(event.tenantId, fullEvent)
    this.emit('*', fullEvent)
  }

  async subscribe(tenantId: string, handler: (e: RenoEvent) => void): Promise<() => void> {
    const channel = `${CHANNEL_PREFIX}${tenantId}`
    await this.sub.subscribe(channel)
    this.on(tenantId, handler)
    return () => {
      this.off(tenantId, handler)
    }
  }

  async disconnect() {
    await this.pub.quit()
    await this.sub.quit()
  }
}
