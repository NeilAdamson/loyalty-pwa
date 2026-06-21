import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import Redis from 'ioredis'
import { requireEnv } from '../utils/config'
import { RedisRateLimiter } from '../services/redis-rate-limiter.service'
import { FraudEventService } from '../services/fraud-event.service'

declare module 'fastify' {
    interface FastifyInstance {
        redis: Redis
        rateLimiter: RedisRateLimiter
        fraudEvents: FraudEventService
    }
}

const redisPlugin: FastifyPluginAsync = async (fastify) => {
    const url = requireEnv('REDIS_URL')
    const redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
    })

    const rateLimiter = new RedisRateLimiter(redis)
    const fraudEvents = new FraudEventService(fastify.prisma, redis)

    fastify.decorate('redis', redis)
    fastify.decorate('rateLimiter', rateLimiter)
    fastify.decorate('fraudEvents', fraudEvents)

    fastify.addHook('onClose', async () => {
        await redis.quit()
    })
}

export default fp(redisPlugin)
