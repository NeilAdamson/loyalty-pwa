import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            vendor_id: string
            role?: string
            staff_id?: string
            member_id?: string
            card_id?: string
            jti?: string
        }
        user: {
            vendor_id: string
            role?: string
            staff_id?: string
            member_id?: string
            card_id?: string
            jti?: string
        }
    }
}

export default fp(async (fastify) => {
    // Register JWT
    // In a real app, use a strong secret from ENV. 
    // For this milestone, we'll assume process.env.JWT_SECRET is set or fallback.
    await fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecret_dev_key_change_me',
    })

    // Auth Decorator
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify()
            // Enforce vendor_id existence
            if (!request.user.vendor_id) {
                throw new Error('Invalid Token: Missing vendor context')
            }

            // Check Vendor Status strictly
            // We need to fetch vendor status here. 
            // Performance Note: This adds a DB query to every auth request. 
            // For MVP, this is acceptable for safety. Later cache it.
            const vendor = await fastify.prisma.vendor.findUnique({
                where: { vendor_id: request.user.vendor_id },
                select: { status: true }
            })

            if (!vendor) {
                reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Vendor not found' })
                return
            }

            if (vendor.status !== 'ACTIVE' && vendor.status !== 'TRIAL') {
                reply.status(403).send({
                    code: 'VENDOR_SUSPENDED', // Must match ERROR_CODES.VENDOR_SUSPENDED
                    message: 'Vendor account is suspended'
                })
                return // Stop execution
            }

            // Append status to user object if needed, or just proceed
        } catch (err) {
            reply.status(401).send({
                code: 'UNAUTHORIZED',
                message: 'Invalid or missing authentication token',
            })
        }
    })
})
