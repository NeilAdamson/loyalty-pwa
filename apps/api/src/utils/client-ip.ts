import type { FastifyRequest } from 'fastify'

/** Client IP for rate limiting; prefers X-Forwarded-For when trustProxy is enabled. */
export function getClientIp(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for']
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        const first = forwarded.split(',')[0]?.trim()
        if (first) return first
    }
    return request.ip || '0.0.0.0'
}
